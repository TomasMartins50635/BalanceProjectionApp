using BalanceProjectionApp.Application.Features.Colaboradores.Common;
using BalanceProjectionApp.Application.Features.Diagnostico.Dtos;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Diagnostico.Queries.VerificarConsistencia;

/// <summary>
/// Recalcula, sem gravar nada, o que a Despesa de IVA e a Despesa de comissão de cada
/// colaborador deveriam valer — considerando parcelas pagas e não pagas — e compara com o
/// que está persistido, para detetar desvios causados por dados antigos, bugs já corrigidos
/// ou edições manuais. A correção automática (CorrigirInconsistenciasCommand) só consegue
/// atuar sobre a parte não paga; um desvio numa parcela já liquidada continua a aparecer
/// depois de corrigir, porque parcelas pagas são imutáveis por regra de negócio.
/// </summary>
public class VerificarConsistenciaQueryHandler(
    IReceitaRepository receitaRepository,
    IColaboradorRepository colaboradorRepository,
    IDespesaRepository despesaRepository) : IRequestHandler<VerificarConsistenciaQuery, ConsistenciaDto>
{
    private const decimal TaxaIva = 0.23m;
    private const decimal TaxaBruta = 1.23m;
    private const decimal Tolerancia = 0.01m;

    public async Task<ConsistenciaDto> Handle(VerificarConsistenciaQuery request, CancellationToken cancellationToken)
    {
        var receitas = (await receitaRepository.ListarAsync(cancellationToken)).ToList();

        var inconsistenciasIva = VerificarIva(receitas);
        var inconsistenciasParcelaReceita = VerificarParcelasReceita(receitas);
        var inconsistenciasComissao = await VerificarComissoesAsync(cancellationToken);
        return new ConsistenciaDto(inconsistenciasIva, inconsistenciasComissao, inconsistenciasParcelaReceita);
    }

    private IReadOnlyList<InconsistenciaIvaDto> VerificarIva(IEnumerable<Domain.Entities.Receita> receitas)
    {
        var resultado = new List<InconsistenciaIvaDto>();

        foreach (var receita in receitas.Where(r => r.TemIva))
        {
            // Inclui parcelas pagas e não pagas: a taxa de 23% é uma constante fiscal, nunca
            // varia com o tempo, por isso comparar contra parcelas já pagas não gera falsos
            // positivos e permite apanhar bugs antigos que já foram liquidados.
            var esperado = receita.Parcelas
                .Where(p => !p.IsDeleted)
                .Sum(p => Math.Round(p.ValorLiquido * TaxaIva, 2));

            var despesaAtiva = receita.DespesaIva is not null && !receita.DespesaIva.IsDeleted;
            var atual = despesaAtiva
                ? receita.DespesaIva!.Parcelas.Where(p => !p.IsDeleted).Sum(p => p.ValorBruto)
                : 0m;

            if (!despesaAtiva && esperado > 0m)
                resultado.Add(new InconsistenciaIvaDto(receita.Id, receita.Nome, true, esperado, 0m));
            else if (despesaAtiva && Math.Abs(esperado - atual) > Tolerancia)
                resultado.Add(new InconsistenciaIvaDto(receita.Id, receita.Nome, false, esperado, atual));
        }

        return resultado;
    }

    private IReadOnlyList<InconsistenciaParcelaReceitaDto> VerificarParcelasReceita(IEnumerable<Domain.Entities.Receita> receitas)
    {
        var resultado = new List<InconsistenciaParcelaReceitaDto>();

        foreach (var receita in receitas.Where(r => r.TemIva))
        {
            foreach (var p in receita.Parcelas.Where(p => !p.IsDeleted))
            {
                var esperado = Math.Round(p.ValorLiquido * TaxaBruta, 2);
                if (Math.Abs(p.ValorBruto - esperado) > Tolerancia)
                    resultado.Add(new InconsistenciaParcelaReceitaDto(
                        receita.Id, receita.Nome, p.Id, p.Numero, p.DataVencimento, p.IsPaid,
                        p.ValorLiquido, p.ValorBruto, esperado));
            }
        }

        return resultado;
    }

    private async Task<IReadOnlyList<InconsistenciaComissaoDto>> VerificarComissoesAsync(CancellationToken cancellationToken)
    {
        var comissoes = (await colaboradorRepository.ListarTodasComissoesAsync(cancellationToken))
            .Where(c => !c.IsDeleted && !c.Receita.IsDeleted)
            .ToList();

        var pares = ComissaoMesHelper.CalcularPares(
            comissoes.Select(c => c.ColaboradorId).Distinct(),
            comissoes.SelectMany(c => c.Receita.Parcelas.Where(p => !p.IsDeleted).Select(p => p.DataVencimento)));

        var resultado = new List<InconsistenciaComissaoDto>();

        foreach (var (colaboradorId, mes) in pares)
        {
            var contribuintes = comissoes.Where(c => c.ColaboradorId == colaboradorId).ToList();

            var esperado = contribuintes
                .SelectMany(c => c.Receita.Parcelas
                    .Where(p => !p.IsDeleted && p.DataVencimento.Year == mes.Year && p.DataVencimento.Month == mes.Month)
                    .Select(p => Math.Round(p.ValorLiquido * c.Percentagem / 100m, 2)))
                .Sum();

            var despesa = await despesaRepository.ObterPorColaboradorEMesAsync(colaboradorId, mes, cancellationToken);
            var atual = despesa?.Parcelas.Where(p => !p.IsDeleted).Sum(p => p.ValorBruto) ?? 0m;

            if (Math.Abs(esperado - atual) > Tolerancia)
            {
                var nome = contribuintes[0].Colaborador.Nome;
                resultado.Add(new InconsistenciaComissaoDto(colaboradorId, nome, mes, despesa is null, esperado, atual));
            }
        }

        return resultado;
    }
}
