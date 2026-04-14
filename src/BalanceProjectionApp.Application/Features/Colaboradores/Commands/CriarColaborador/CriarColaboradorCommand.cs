using MediatR;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Commands.CriarColaborador;

public record CriarColaboradorCommand(string Nome, decimal Percentagem) : IRequest<Guid>;
