using MediatR;

namespace BalanceProjectionApp.Application.Features.Contas.Commands.CriarConta;

public record CriarContaCommand(string Nome, decimal SaldoInicial = 0m) : IRequest<Guid>;
