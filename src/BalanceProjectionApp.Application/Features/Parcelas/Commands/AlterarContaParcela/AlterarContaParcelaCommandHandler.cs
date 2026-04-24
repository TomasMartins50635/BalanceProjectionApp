using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Parcelas.Commands.AlterarContaParcela;

public class AlterarContaParcelaCommandHandler(
    IParcelaRepository parcelaRepository,
    IContaRepository contaRepository,
    IUnitOfWork uow) : IRequestHandler<AlterarContaParcelaCommand>
{
    public async Task Handle(AlterarContaParcelaCommand request, CancellationToken cancellationToken)
    {
        var parcela = await parcelaRepository.ObterPorIdAsync(request.ParcelaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Parcela), request.ParcelaId);

        _ = await contaRepository.ObterPorIdAsync(request.ContaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Conta), request.ContaId);

        parcela.AlterarConta(request.ContaId);

        await uow.SaveChangesAsync(cancellationToken);
    }
}
