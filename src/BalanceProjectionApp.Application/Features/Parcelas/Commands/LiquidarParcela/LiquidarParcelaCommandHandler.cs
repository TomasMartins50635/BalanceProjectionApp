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
    public async Task<LiquidarParcelaResult> Handle(LiquidarParcelaCommand request, CancellationToken cancellationToken)
    {
        var parcela = await ObterParcelaAsync(request.ParcelaId, cancellationToken);

        RedirecionarContaSeNecessario(request, parcela);

        var conta = await ObterContaAsync(parcela.ContaId, cancellationToken);

        AplicarValorRealSeInformado(request, parcela);

        parcela.Liquidar(request.DataPagamento);
        AtualizarSaldoConta(conta, parcela);

        await ProcessarGeracaoProximaParcelaAsync(parcela, cancellationToken);

        await uow.SaveChangesAsync(cancellationToken);

        return new LiquidarParcelaResult(parcela.Id, parcela.ValorLiquido, conta.Saldo);
    }

    private static void RedirecionarContaSeNecessario(LiquidarParcelaCommand request, Parcela parcela)
    {
        if (request.ContaId.HasValue && request.ContaId.Value != parcela.ContaId)
            parcela.AlterarConta(request.ContaId.Value);
    }

    private static void AplicarValorRealSeInformado(LiquidarParcelaCommand request, Parcela parcela)
    {
        if (request.ValorReal.HasValue && parcela.DespesaId.HasValue)
            parcela.AtualizarValor(request.ValorReal.Value);
    }

    private static void AtualizarSaldoConta(Conta conta, Parcela parcela)
    {
        if (parcela.EReceita())
            conta.Creditar(parcela.ValorLiquido);
        else
            conta.Debitar(parcela.ValorLiquido);
    }

    private async Task<Parcela> ObterParcelaAsync(Guid parcelaId, CancellationToken cancellationToken)
        => await parcelaRepository.ObterPorIdAsync(parcelaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Parcela), parcelaId);

    private async Task<Conta> ObterContaAsync(Guid contaId, CancellationToken cancellationToken)
        => await contaRepository.ObterPorIdAsync(contaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Conta), contaId);

    private async Task<Despesa> ObterDespesaAsync(Guid despesaId, CancellationToken cancellationToken)
        => await despesaRepository.ObterPorIdComParcelasAsync(despesaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Despesa), despesaId);

    private static bool DeveGerarProximaParcela(Despesa despesa)
        => despesa.IsActive
           && despesa.TipoDespesa != TipoDespesa.Pontual
           && !despesa.Parcelas.Any(p => !p.IsPaid);

    private async Task<decimal?> ObterValorRestanteFinanciamentoAsync(Despesa despesa, CancellationToken cancellationToken)
    {
        var financiamento = await financiamentoRepository.ObterPorDespesaIdAsync(despesa.Id, cancellationToken);
        if (financiamento is null)
            return null;

        var valorPago = despesa.Parcelas.Where(p => p.IsPaid).Sum(p => p.ValorLiquido);
        if (valorPago > financiamento.Valor)
            throw new DomainException("O total pago nas despesas associadas não pode ultrapassar o valor do financiamento.");

        return financiamento.Valor - valorPago;
    }

    private static bool FinanciamentoEsgotado(decimal? valorRestanteFinanciamento)
        => valorRestanteFinanciamento.HasValue && valorRestanteFinanciamento.Value <= 0m;

    private static void AjustarValorParcelaParaFinanciamento(Parcela novaParcela, decimal? valorRestanteFinanciamento)
    {
        if (valorRestanteFinanciamento.HasValue && novaParcela.ValorLiquido > valorRestanteFinanciamento.Value)
            novaParcela.AtualizarValor(valorRestanteFinanciamento.Value);
    }

    private async Task ProcessarGeracaoProximaParcelaAsync(Parcela parcela, CancellationToken cancellationToken)
    {
        if (!parcela.DespesaId.HasValue)
            return;

        var despesa = await ObterDespesaAsync(parcela.DespesaId.Value, cancellationToken);
        var valorRestanteFinanciamento = await ObterValorRestanteFinanciamentoAsync(despesa, cancellationToken);

        if (!DeveGerarProximaParcela(despesa))
            return;

        if (FinanciamentoEsgotado(valorRestanteFinanciamento))
        {
            despesa.Desativar();
            return;
        }

        var novaParcela = despesa.GerarProximaParcela();
        AjustarValorParcelaParaFinanciamento(novaParcela, valorRestanteFinanciamento);

        await parcelaRepository.AdicionarAsync(novaParcela, cancellationToken);
    }
}
