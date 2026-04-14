using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Contas.Commands.EliminarConta;

public class EliminarContaCommandHandler(
    IContaRepository contaRepository,
    IUnitOfWork uow) : IRequestHandler<EliminarContaCommand>
{
    public async Task Handle(EliminarContaCommand request, CancellationToken ct)
    {
        var conta = await contaRepository.ObterPorIdAsync(request.ContaId, ct)
            ?? throw new EntityNotFoundException(nameof(Conta), request.ContaId);

        if (await contaRepository.TemEntidadesVinculadasAsync(request.ContaId, ct))
            throw new DomainException("Não é possível eliminar uma conta com receitas, despesas ou financiamentos associados.");

        contaRepository.Remover(conta);
        await uow.SaveChangesAsync(ct);
    }
}
