using BalanceProjectionApp.Application.Features.Parcelas.Dtos;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Parcelas.Queries.ListarParcelas;

public class ListarParcelasQueryHandler(IParcelaRepository repository)
    : IRequestHandler<ListarParcelasQuery, IEnumerable<ParcelaDto>>
{
    public async Task<IEnumerable<ParcelaDto>> Handle(ListarParcelasQuery request, CancellationToken ct)
    {
        var parcelas = await repository.ListarPorContaAsync(request.ContaId, ct);

        if (request.ApenasPendentes == true)
            parcelas = parcelas.Where(p => !p.IsPaid);

        return parcelas.Select(p => new ParcelaDto(
            p.Id, p.Numero, p.DataVencimento,
            p.ValorBruto, p.ValorLiquido,
            p.IsPaid, p.DataPagamento.HasValue ? DateOnly.FromDateTime(p.DataPagamento.Value) : null,
            p.ReceitaId, p.DespesaId, p.ContaId, p.Percentagem,
            p.Receita?.Nome ?? p.Despesa?.Nome));
    }
}
