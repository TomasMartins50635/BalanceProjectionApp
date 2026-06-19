using BalanceProjectionApp.Application.Features.Previsoes.Dtos;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Previsoes.Queries.ObterDefaultsPrevisao;

public record ObterDefaultsPrevisaoQuery(Guid? ContaId) : IRequest<DefaultsPrevisaoDto>;
