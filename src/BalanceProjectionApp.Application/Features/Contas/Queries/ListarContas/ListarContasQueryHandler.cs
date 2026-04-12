using BalanceProjectionApp.Application.Features.Contas.Dtos;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Contas.Queries.ListarContas;

public class ListarContasQueryHandler(IContaRepository repository)
    : IRequestHandler<ListarContasQuery, IEnumerable<ContaDto>>
{
    public async Task<IEnumerable<ContaDto>> Handle(ListarContasQuery request, CancellationToken ct)
    {
        var contas = await repository.ListarAsync(ct);
        return contas.Select(c => new ContaDto(c.Id, c.Nome, c.Saldo));
    }
}
