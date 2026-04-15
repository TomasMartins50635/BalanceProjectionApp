using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Parcelas.Commands.RemoverParcela;

public class RemoverParcelaCommandHandler(
    IParcelaRepository parcelaRepository,
    IUnitOfWork uow) : IRequestHandler<RemoverParcelaCommand>
{
    public async Task Handle(RemoverParcelaCommand request, CancellationToken ct)
    {
        var parcela = await parcelaRepository.ObterPorIdAsync(request.Id, ct)
            ?? throw new EntityNotFoundException(nameof(Parcela), request.Id);

        if (parcela.IsPaid)
            throw new DomainException("Não é possível eliminar uma parcela já liquidada.");

        parcelaRepository.Remover(parcela);
        await uow.SaveChangesAsync(ct);
    }
}
