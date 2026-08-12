using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Contas.Commands.AjustarSaldoConta;

public class AjustarSaldoContaCommandHandler(
    IContaRepository contaRepository,
    IUnitOfWork uow) : IRequestHandler<AjustarSaldoContaCommand>
{
    public async Task Handle(AjustarSaldoContaCommand request, CancellationToken cancellationToken)
    {
        var conta = await contaRepository.ObterPorIdAsync(request.ContaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Conta), request.ContaId);

        conta.AjustarSaldo(request.NovoSaldo);
        await uow.SaveChangesAsync(cancellationToken);
    }
}
