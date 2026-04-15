using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.AtivarDesativarDespesa;

public class AtivarDesativarDespesaCommandHandler(
    IDespesaRepository despesaRepository,
    IUnitOfWork uow) : IRequestHandler<AtivarDesativarDespesaCommand>
{
    public async Task Handle(AtivarDesativarDespesaCommand request, CancellationToken ct)
    {
        var despesa = await despesaRepository.ObterPorIdAsync(request.Id, ct)
            ?? throw new EntityNotFoundException(nameof(Despesa), request.Id);

        if (request.IsActive) despesa.Ativar(); else despesa.Desativar();

        await uow.SaveChangesAsync(ct);
    }
}
