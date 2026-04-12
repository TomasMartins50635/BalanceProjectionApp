using BalanceProjectionApp.Application.Features.Contas.Dtos;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Contas.Queries.ObterConta;

public record ObterContaQuery(Guid Id) : IRequest<ContaDto?>;
