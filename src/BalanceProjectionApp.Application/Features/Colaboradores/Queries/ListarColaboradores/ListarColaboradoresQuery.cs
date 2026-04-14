using BalanceProjectionApp.Application.Features.Colaboradores.Dtos;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Queries.ListarColaboradores;

public record ListarColaboradoresQuery : IRequest<IEnumerable<ColaboradorDto>>;
