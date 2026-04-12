using BalanceProjectionApp.Application.Features.Contas.Dtos;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Contas.Queries.ListarContas;

public record ListarContasQuery : IRequest<IEnumerable<ContaDto>>;
