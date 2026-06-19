using BalanceProjectionApp.Application.Features.Previsoes.Dtos;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Previsoes.Queries.ListarPrevisoes;

public class ListarPrevisoesQueryHandler(IPrevisaoRepository repository)
    : IRequestHandler<ListarPrevisoesQuery, IEnumerable<PrevisaoDto>>
{
    public async Task<IEnumerable<PrevisaoDto>> Handle(ListarPrevisoesQuery request, CancellationToken cancellationToken)
    {
        var previsoes = await repository.ListarPorContaAsync(request.ContaId, cancellationToken);
        return previsoes.Select(p => new PrevisaoDto(
            p.Id, p.Nome, p.ContaId,
            p.DiasEntreVendas, p.ValorMedioVenda,
            p.DiasEntreArrendamentos, p.ValorMedioArrendamento,
            p.CreatedAt));
    }
}
