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
    public async Task Handle(RemoverParcelaCommand request, CancellationToken cancellationToken)
    {
        var parcela = await parcelaRepository.ObterPorIdAsync(request.Id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Parcela), request.Id);

        parcela.Deletar();
        await uow.SaveChangesAsync(cancellationToken);
    }
}
