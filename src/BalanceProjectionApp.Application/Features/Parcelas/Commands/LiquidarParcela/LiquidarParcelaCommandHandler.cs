using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Parcelas.Commands.LiquidarParcela;

public class LiquidarParcelaCommandHandler(
    IParcelaRepository parcelaRepository,
    IContaRepository contaRepository,
    IDespesaRepository despesaRepository,
    IUnitOfWork uow) : IRequestHandler<LiquidarParcelaCommand, LiquidarParcelaResult>
{
    public async Task<LiquidarParcelaResult> Handle(LiquidarParcelaCommand request, CancellationToken ct)
    {
        var parcela = await parcelaRepository.ObterPorIdAsync(request.ParcelaId, ct)
            ?? throw new EntityNotFoundException(nameof(Parcela), request.ParcelaId);

        var conta = await contaRepository.ObterPorIdAsync(parcela.ContaId, ct)
            ?? throw new EntityNotFoundException(nameof(Conta), parcela.ContaId);

        // Para despesas Recorrentes, o utilizador pode definir o valor real no momento da liquidação
        if (request.ValorReal.HasValue && parcela.DespesaId.HasValue)
            parcela.AtualizarValor(request.ValorReal.Value);

        parcela.Liquidar(request.DataPagamento);

        if (parcela.EReceita())
            conta.Creditar(parcela.ValorLiquido);
        else
            conta.Debitar(parcela.ValorLiquido);

        // Gerar próxima parcela automaticamente para Fixas e Recorrentes ativas
        if (parcela.DespesaId.HasValue)
        {
            var despesa = await despesaRepository.ObterPorIdComParcelasAsync(parcela.DespesaId.Value, ct)
                ?? throw new EntityNotFoundException(nameof(Despesa), parcela.DespesaId.Value);

            if (despesa.IsActive && despesa.TipoDespesa != TipoDespesa.Pontual)
            {
                // Só gera se não há parcelas pendentes (EF identity resolution garante que
                // a parcela recém-liquidada já aparece com IsPaid = true na coleção)
                var temPendentes = despesa.Parcelas.Any(p => !p.IsPaid);
                if (!temPendentes)
                    despesa.GerarProximaParcela();
            }
        }

        await uow.SaveChangesAsync(ct);

        return new LiquidarParcelaResult(parcela.Id, parcela.ValorLiquido, conta.Saldo);
    }
}
