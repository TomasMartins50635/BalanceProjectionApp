using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.RemoverDespesa;

public class RemoverDespesaCommandHandler(
    IDespesaRepository despesaRepository,
    IUnitOfWork uow) : IRequestHandler<RemoverDespesaCommand>
{
    public async Task Handle(RemoverDespesaCommand request, CancellationToken ct)
    {
        var despesa = await despesaRepository.ObterPorIdAsync(request.Id, ct)
            ?? throw new EntityNotFoundException(nameof(Despesa), request.Id);

        despesaRepository.Remover(despesa);
        await uow.SaveChangesAsync(ct);
    }
}
