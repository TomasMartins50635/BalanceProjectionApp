using BalanceProjectionApp.Application.Features.Financiamentos.Dtos;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Queries.ListarFinanciamentos;

public class ListarFinanciamentosQueryHandler(IFinanciamentoRepository repository)
    : IRequestHandler<ListarFinanciamentosQuery, IEnumerable<FinanciamentoDto>>
{
    public async Task<IEnumerable<FinanciamentoDto>> Handle(ListarFinanciamentosQuery request, CancellationToken ct)
    {
        var financiamentos = await repository.ListarPorContaAsync(request.ContaId, ct);
        return financiamentos.Select(f => new FinanciamentoDto(
            f.Id, f.Nome, f.Valor, f.Data, f.ContaId, f.DespesaId));
    }
}
