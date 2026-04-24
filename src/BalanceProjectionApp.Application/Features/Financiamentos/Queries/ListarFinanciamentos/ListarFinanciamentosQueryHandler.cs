using BalanceProjectionApp.Application.Features.Financiamentos.Dtos;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Queries.ListarFinanciamentos;

public class ListarFinanciamentosQueryHandler(IFinanciamentoRepository repository)
    : IRequestHandler<ListarFinanciamentosQuery, IEnumerable<FinanciamentoDto>>
{
    public async Task<IEnumerable<FinanciamentoDto>> Handle(ListarFinanciamentosQuery request, CancellationToken cancellationToken)
    {
        var financiamentos = await repository.ListarPorContaAsync(request.ContaId, cancellationToken);
        return financiamentos.Select(f =>
        {
            var parcelas = f.Despesa?.Parcelas ?? [];
            var totalParcelas = parcelas.Count;
            var parcelasPagas = parcelas.Count(p => p.IsPaid);
            var valorPago = Math.Min(parcelas.Where(p => p.IsPaid).Sum(p => p.ValorLiquido), f.Valor);
            var valorRestante = Math.Max(f.Valor - valorPago, 0m);
            var valorMensalidade = f.Despesa?.ValorFixo
                ?? parcelas.OrderBy(p => p.Numero).FirstOrDefault()?.ValorLiquido
                ?? 0m;
            var progressoPercentagem = f.Valor <= 0
                ? 0m
                : Math.Round(valorPago * 100m / f.Valor, 2);

            return new FinanciamentoDto(
                f.Id,
                f.Nome,
                f.Valor,
                f.Data,
                f.ContaId,
                f.DespesaId,
                valorMensalidade,
                totalParcelas,
                parcelasPagas,
                valorPago,
                valorRestante,
                progressoPercentagem);
        });
    }
}
