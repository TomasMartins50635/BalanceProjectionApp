using BalanceProjectionApp.Application.Features.Colaboradores.Dtos;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Queries.ObterEstatisticasColaborador;

public class ObterEstatisticasColaboradorQueryHandler(IColaboradorRepository repository)
    : IRequestHandler<ObterEstatisticasColaboradorQuery, ColaboradorEstatisticasDto?>
{
    public async Task<ColaboradorEstatisticasDto?> Handle(
        ObterEstatisticasColaboradorQuery request,
        CancellationToken cancellationToken)
    {
        var colaborador = await repository.ObterPorIdAsync(request.ColaboradorId, cancellationToken);
        if (colaborador == null) return null;

        var comissoes = await repository.ListarComissoesAsync(request.ColaboradorId, cancellationToken);

        var comissoesAtivas = comissoes.Where(c => !c.IsDeleted && !c.Receita.IsDeleted).ToList();

        // Filtra pela data de vencimento da parcela — mostra pagas e não pagas dentro do período.
        // Uma receita só aparece se tiver pelo menos uma parcela a vencer no intervalo pedido.
        var receitaDetalhes = comissoesAtivas
            .Select(c =>
            {
                var parcelas = c.Receita.Parcelas
                    .Where(p => !p.IsDeleted
                        && p.DataVencimento >= request.DataInicio
                        && p.DataVencimento <= request.DataFim)
                    .Select(p =>
                    {
                        // A comissão incide sobre ValorLiquido (valor pré-IVA), nunca sobre ValorBruto —
                        // tem de bater certo com o que ComissaoDespesaSincronizador gera na despesa real.
                        var valorComissao = Math.Round(p.ValorLiquido * c.Percentagem / 100, 2);
                        var dataPag = p.DataPagamento.HasValue
                            ? DateOnly.FromDateTime(p.DataPagamento.Value)
                            : (DateOnly?)null;
                        return new ParcelaParticipacaoDto(
                            p.Id, p.Numero, p.DataVencimento, dataPag,
                            p.ValorBruto, valorComissao, p.IsPaid);
                    })
                    .OrderBy(p => p.DataVencimento)
                    .ToList();

                var recebidoPeriodo = parcelas.Where(p => p.IsPaid).Sum(p => p.ValorComissao);
                var pendente = parcelas.Where(p => !p.IsPaid).Sum(p => p.ValorComissao);

                return new ReceitaParticipacaoDto(
                    c.ReceitaId,
                    c.Receita.Nome,
                    c.Receita.Categoria?.ToString(),
                    c.TipoComissao.ToString(),
                    c.Percentagem,
                    recebidoPeriodo,
                    pendente,
                    parcelas);
            })
            .Where(r => r.Parcelas.Any())
            .ToList();

        var allParcelas = receitaDetalhes.SelectMany(r => r.Parcelas).ToList();

        var porTipo = receitaDetalhes
            .GroupBy(r => r.TipoComissao)
            .Select(g =>
            {
                var gParcelas = g.SelectMany(r => r.Parcelas).ToList();
                return new EstatisticasTipoComissaoDto(
                    g.Key,
                    g.Sum(r => r.RecebidoPeriodo),
                    g.Sum(r => r.Pendente),
                    gParcelas.Count(p => p.IsPaid),
                    gParcelas.Count(p => !p.IsPaid));
            })
            .ToList();

        // Total histórico (all-time) independente do período selecionado.
        var totalRecebidoGlobal = comissoesAtivas
            .SelectMany(c => c.Receita.Parcelas
                .Where(p => !p.IsDeleted && p.IsPaid)
                .Select(p => Math.Round(p.ValorLiquido * c.Percentagem / 100, 2)))
            .Sum();

        return new ColaboradorEstatisticasDto(
            colaborador.Id,
            colaborador.Nome,
            colaborador.Tipo,
            request.DataInicio,
            request.DataFim,
            receitaDetalhes.Sum(r => r.RecebidoPeriodo),
            receitaDetalhes.Sum(r => r.Pendente),
            totalRecebidoGlobal,
            receitaDetalhes.Select(r => r.ReceitaId).Distinct().Count(),
            allParcelas.Count(p => p.IsPaid),
            allParcelas.Count(p => !p.IsPaid),
            receitaDetalhes.Where(r => r.Categoria == "Vendas").Select(r => r.ReceitaId).Distinct().Count(),
            receitaDetalhes.Where(r => r.Categoria == "Arrendamentos").Select(r => r.ReceitaId).Distinct().Count(),
            porTipo,
            receitaDetalhes);
    }
}
