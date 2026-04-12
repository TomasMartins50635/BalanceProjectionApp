using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Contas.Commands.CriarConta;

public class CriarContaCommandHandler(IContaRepository repository, IUnitOfWork uow)
    : IRequestHandler<CriarContaCommand, Guid>
{
    public async Task<Guid> Handle(CriarContaCommand request, CancellationToken ct)
    {
        var conta = Conta.Criar(request.Nome, request.SaldoInicial);
        await repository.AdicionarAsync(conta, ct);
        await uow.SaveChangesAsync(ct);
        return conta.Id;
    }
}
