using BalanceProjectionApp.Application.Features.Despesas.Dtos;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Queries.ListarDespesas;

public record ListarDespesasQuery : IRequest<IEnumerable<DespesaDto>>;
