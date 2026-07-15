using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Common;

public class ComissaoDespesaSincronizador(
    IColaboradorRepository colaboradorRepository,
    IDespesaRepository despesaRepository,
    IParcelaRepository parcelaRepository,
    IUnitOfWork uow) : IComissaoDespesaSincronizador
{
    public async Task RecalcularAsync(Guid colaboradorId, DateOnly mesReferencia, CancellationToken cancellationToken = default)
    {
        var colaborador = await colaboradorRepository.ObterPorIdAsync(colaboradorId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Domain.Entities.Colaborador), colaboradorId);

        var comissoes = await colaboradorRepository.ListarComissoesAsync(colaboradorId, cancellationToken);

        var contribuintes = comissoes
            .Where(c => !c.Receita.IsDeleted)
            .Select(c => new
            {
                c.Receita,
                c.Percentagem,
                Parcelas = c.Receita.Parcelas
                    .Where(p => !p.IsDeleted
                        && p.DataVencimento.Year == mesReferencia.Year
                        && p.DataVencimento.Month == mesReferencia.Month)
                    .ToList()
            })
            .Where(x => x.Parcelas.Count > 0)
            .OrderBy(x => x.Receita.CreatedAt)
            .ToList();

        var total = contribuintes
            .SelectMany(x => x.Parcelas.Select(p => Math.Round(p.ValorLiquido * x.Percentagem / 100m, 2)))
            .Sum();

        var despesaExistente = await despesaRepository.ObterPorColaboradorEMesAsync(colaboradorId, mesReferencia, cancellationToken);

        if (despesaExistente is null)
        {
            if (total <= 0)
                return;

            var contaId = contribuintes[0].Receita.ContaId;
            var despesa = DespesaComissaoFactory.Criar(colaborador, mesReferencia, contaId, total);
            await despesaRepository.AdicionarAsync(despesa, cancellationToken);
        }
        else
        {
            var novaParcela = DespesaComissaoFactory.Sincronizar(despesaExistente, mesReferencia, total);
            if (novaParcela is not null)
                await parcelaRepository.AdicionarAsync(novaParcela, cancellationToken);

            DespesaComissaoFactory.RemoverSeVazia(despesaExistente);
        }

        await uow.SaveChangesAsync(cancellationToken);
    }
}
