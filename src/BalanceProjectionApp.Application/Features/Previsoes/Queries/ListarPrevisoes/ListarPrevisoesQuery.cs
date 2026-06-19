using BalanceProjectionApp.Application.Features.Previsoes.Dtos;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Previsoes.Queries.ListarPrevisoes;

public record ListarPrevisoesQuery(Guid? ContaId) : IRequest<IEnumerable<PrevisaoDto>>;
