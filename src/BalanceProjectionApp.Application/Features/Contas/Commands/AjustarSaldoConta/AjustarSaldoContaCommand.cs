using MediatR;

namespace BalanceProjectionApp.Application.Features.Contas.Commands.AjustarSaldoConta;

public record AjustarSaldoContaCommand(Guid ContaId, decimal NovoSaldo) : IRequest;
