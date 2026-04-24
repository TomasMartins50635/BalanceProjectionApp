using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Parcelas.Commands.EstornarParcela;

public class EstornarParcelaCommandHandler(
    IParcelaRepository parcelaRepository,
    IContaRepository contaRepository,
    IUnitOfWork uow) : IRequestHandler<EstornarParcelaCommand>
{
    public async Task Handle(EstornarParcelaCommand request, CancellationToken cancellationToken)
    {
        var parcela = await parcelaRepository.ObterPorIdAsync(request.ParcelaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Parcela), request.ParcelaId);

        var conta = await contaRepository.ObterPorIdAsync(parcela.ContaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Conta), parcela.ContaId);

        // Inverso da liquidação: receita debitava, despesa creditava
        if (parcela.EReceita())
            conta.Debitar(parcela.ValorLiquido);
        else
            conta.Creditar(parcela.ValorLiquido);

        parcela.Estornar();

        await uow.SaveChangesAsync(cancellationToken);
    }
}
