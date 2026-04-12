using BalanceProjectionApp.Application.Features.Receitas.Dtos;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Queries.ListarReceitas;

public record ListarReceitasQuery : IRequest<IEnumerable<ReceitaDto>>;
