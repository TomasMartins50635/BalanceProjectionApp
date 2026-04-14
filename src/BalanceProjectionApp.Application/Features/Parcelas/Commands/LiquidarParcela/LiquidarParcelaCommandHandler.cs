using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Parcelas.Commands.LiquidarParcela;

public class LiquidarParcelaCommandHandler(
    IParcelaRepository parcelaRepository,
    IContaRepository contaRepository,
    IUnitOfWork uow) : IRequestHandler<LiquidarParcelaCommand, LiquidarParcelaResult>
{
    public async Task<LiquidarParcelaResult> Handle(LiquidarParcelaCommand request, CancellationToken ct)
    {
        var parcela = await parcelaRepository.ObterPorIdAsync(request.ParcelaId, ct)
            ?? throw new EntityNotFoundException(nameof(Parcela), request.ParcelaId);

        var conta = await contaRepository.ObterPorIdAsync(parcela.ContaId, ct)
            ?? throw new EntityNotFoundException(nameof(Conta), parcela.ContaId);

        // Regra de negócio: liquidar a parcela (lança DomainException se já paga)
        parcela.Liquidar(request.DataPagamento);

        // Atualiza saldo: receita credita, despesa debita
        if (parcela.EReceita())
            conta.Creditar(parcela.ValorLiquido);
        else
            conta.Debitar(parcela.ValorLiquido);

        await uow.SaveChangesAsync(ct);

        return new LiquidarParcelaResult(parcela.Id, parcela.ValorLiquido, conta.Saldo);
    }
}
