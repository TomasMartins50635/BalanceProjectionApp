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
    IFinanciamentoRepository financiamentoRepository,
    IUnitOfWork uow) : IRequestHandler<LiquidarParcelaCommand, LiquidarParcelaResult>
{
    public async Task<LiquidarParcelaResult> Handle(LiquidarParcelaCommand request, CancellationToken ct)
    {
        var parcela = await parcelaRepository.ObterPorIdAsync(request.ParcelaId, ct)
            ?? throw new EntityNotFoundException(nameof(Parcela), request.ParcelaId);

        // Se foi especificada uma conta diferente, redirecionar o movimento
        if (request.ContaId.HasValue && request.ContaId.Value != parcela.ContaId)
            parcela.AlterarConta(request.ContaId.Value);

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

            decimal? valorRestanteFinanciamento = null;
            var financiamento = await financiamentoRepository.ObterPorDespesaIdAsync(despesa.Id, ct);

            if (financiamento is not null)
            {
                var valorPago = despesa.Parcelas.Where(p => p.IsPaid).Sum(p => p.ValorLiquido);
                if (valorPago > financiamento.Valor)
                    throw new DomainException("O total pago nas despesas associadas não pode ultrapassar o valor do financiamento.");

                valorRestanteFinanciamento = financiamento.Valor - valorPago;
            }

            if (despesa.IsActive && despesa.TipoDespesa != TipoDespesa.Pontual)
            {
                var temPendentes = despesa.Parcelas.Any(p => !p.IsPaid);
                if (!temPendentes)
                {
                    if (valorRestanteFinanciamento.HasValue && valorRestanteFinanciamento.Value <= 0m)
                    {
                        despesa.Desativar();
                    }
                    else
                    {
                    var novaParcela = despesa.GerarProximaParcela();
                    if (valorRestanteFinanciamento.HasValue && novaParcela.ValorLiquido > valorRestanteFinanciamento.Value)
                        novaParcela.AtualizarValor(valorRestanteFinanciamento.Value);

                    await parcelaRepository.AdicionarAsync(novaParcela, ct);
                    }
                }
            }
        }

        await uow.SaveChangesAsync(ct);

        return new LiquidarParcelaResult(parcela.Id, parcela.ValorLiquido, conta.Saldo);
    }
}
