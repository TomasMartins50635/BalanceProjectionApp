using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Parcelas.Commands.LiquidarParcela;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class LiquidarParcelaHandlerTests
{
    private readonly IParcelaRepository _parcelaRepo = Substitute.For<IParcelaRepository>();
    private readonly IContaRepository _contaRepo = Substitute.For<IContaRepository>();
    private readonly IDespesaRepository _despesaRepo = Substitute.For<IDespesaRepository>();
    private readonly IFinanciamentoRepository _financiamentoRepo = Substitute.For<IFinanciamentoRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly LiquidarParcelaCommandHandler _handler;

    private static readonly DateOnly Vencimento = new(2026, 6, 1);

    public LiquidarParcelaHandlerTests()
    {
        _handler = new LiquidarParcelaCommandHandler(_parcelaRepo, _contaRepo, _despesaRepo, _financiamentoRepo, _uow);
        _financiamentoRepo.ObterPorDespesaIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((Financiamento?)null);
    }

    private static (Parcela parcela, Conta conta) CriarParcelaReceita(decimal valorTotal = 10_000m)
    {
        var contaId = Guid.NewGuid();
        var conta = Conta.Criar("Conta", 0m);
        var receita = Receita.Criar("Proj", contaId);
        var parcela = receita.AdicionarParcela(1, Vencimento, 100m);
        return (parcela, conta);
    }

    private static (Parcela parcela, Conta conta) CriarParcelaDespesa(decimal valor = 500m)
    {
        var contaId = Guid.NewGuid();
        var conta = Conta.Criar("Conta", 1000m);
        var despesa = Despesa.Criar("Renda", contaId);
        var parcela = despesa.AdicionarParcela(1, Vencimento, valor);
        return (parcela, conta);
    }

    private static (Despesa despesa, Parcela parcela, Conta conta) CriarParcelaDespesaRecorrente()
    {
        var contaId = Guid.NewGuid();
        var conta = Conta.Criar("Conta", 1000m);
        var despesa = Despesa.Criar("Subscricao", contaId, tipo: TipoDespesa.Recorrente, valorFixo: 80m, periodicidade: Periodicidade.Mensal, dataInicio: new DateOnly(2026, 6, 1));
        var parcela = despesa.GerarProximaParcela();
        return (despesa, parcela, conta);
    }

    [Fact]
    public async Task Handle_ParcelaDeReceita_CreditaSaldoDaConta()
    {
        var (parcela, conta) = CriarParcelaReceita(10_000m);
        _parcelaRepo.ObterPorIdAsync(parcela.Id, Arg.Any<CancellationToken>()).Returns(parcela);
        _contaRepo.ObterPorIdAsync(parcela.ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        var result = await _handler.Handle(new LiquidarParcelaCommand(parcela.Id, null), CancellationToken.None);

        conta.Saldo.Should().Be(100m); // creditado com o valor da parcela (100m)
        result.NovoSaldoConta.Should().Be(100m);
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ParcelaDeDespesa_DebitaSaldoDaConta()
    {
        var (parcela, conta) = CriarParcelaDespesa(500m);
        var despesa = Despesa.Criar("Renda", parcela.ContaId);
        despesa.AdicionarParcela(parcela.Numero, parcela.DataVencimento, parcela.ValorBruto);
        _parcelaRepo.ObterPorIdAsync(parcela.Id, Arg.Any<CancellationToken>()).Returns(parcela);
        _contaRepo.ObterPorIdAsync(parcela.ContaId, Arg.Any<CancellationToken>()).Returns(conta);
        _despesaRepo.ObterPorIdComParcelasAsync(parcela.DespesaId!.Value, Arg.Any<CancellationToken>()).Returns(despesa);

        var result = await _handler.Handle(new LiquidarParcelaCommand(parcela.Id, null), CancellationToken.None);

        conta.Saldo.Should().Be(500m); // 1000 - 500
        result.NovoSaldoConta.Should().Be(500m);
    }

    [Fact]
    public async Task Handle_DespesaRecorrente_ComValorReal_DebitaComValorInformadoEGeraProximaParcela()
    {
        var (despesa, parcela, conta) = CriarParcelaDespesaRecorrente();
        _parcelaRepo.ObterPorIdAsync(parcela.Id, Arg.Any<CancellationToken>()).Returns(parcela);
        _contaRepo.ObterPorIdAsync(parcela.ContaId, Arg.Any<CancellationToken>()).Returns(conta);
        _despesaRepo.ObterPorIdComParcelasAsync(parcela.DespesaId!.Value, Arg.Any<CancellationToken>()).Returns(despesa);

        var result = await _handler.Handle(new LiquidarParcelaCommand(parcela.Id, null, 120m), CancellationToken.None);

        parcela.ValorLiquido.Should().Be(120m);
        conta.Saldo.Should().Be(880m);
        result.NovoSaldoConta.Should().Be(880m);
        despesa.Parcelas.Count(p => !p.IsPaid).Should().Be(1);
        despesa.Parcelas.Should().HaveCount(2);
    }

    [Fact]
    public async Task Handle_ComDataPagamento_UsaDataFornecida()
    {
        var (parcela, conta) = CriarParcelaReceita();
        _parcelaRepo.ObterPorIdAsync(parcela.Id, Arg.Any<CancellationToken>()).Returns(parcela);
        _contaRepo.ObterPorIdAsync(parcela.ContaId, Arg.Any<CancellationToken>()).Returns(conta);
        var dataPagamento = new DateOnly(2026, 5, 10);

        await _handler.Handle(new LiquidarParcelaCommand(parcela.Id, dataPagamento), CancellationToken.None);

        parcela.DataPagamento.Should().Be(dataPagamento.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
    }

    [Fact]
    public async Task Handle_ParcelaNaoExiste_LancaEntityNotFoundException()
    {
        _parcelaRepo.ObterPorIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Parcela?)null);

        var act = async () => await _handler.Handle(
            new LiquidarParcelaCommand(Guid.NewGuid(), null), CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ContaNaoExiste_LancaEntityNotFoundException()
    {
        var (parcela, _) = CriarParcelaReceita();
        _parcelaRepo.ObterPorIdAsync(parcela.Id, Arg.Any<CancellationToken>()).Returns(parcela);
        _contaRepo.ObterPorIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Conta?)null);

        var act = async () => await _handler.Handle(
            new LiquidarParcelaCommand(parcela.Id, null), CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
    }

    [Fact]
    public async Task Handle_ParcelaJaLiquidada_LancaDomainException()
    {
        var (parcela, conta) = CriarParcelaReceita();
        parcela.Liquidar(); // já liquidada
        _parcelaRepo.ObterPorIdAsync(parcela.Id, Arg.Any<CancellationToken>()).Returns(parcela);
        _contaRepo.ObterPorIdAsync(parcela.ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        var act = async () => await _handler.Handle(
            new LiquidarParcelaCommand(parcela.Id, null), CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>();
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_DespesaAssociadaAFinanciamento_NaoPermiteUltrapassarValorFinanciado()
    {
        var contaId = Guid.NewGuid();
        var conta = Conta.Criar("Conta", 1000m);
        var despesa = Despesa.Criar(
            "Financiamento",
            contaId,
            tipo: TipoDespesa.Fixa,
            valorFixo: 120m,
            periodicidade: Periodicidade.Mensal,
            dataInicio: new DateOnly(2026, 6, 1));

        var parcela = despesa.GerarProximaParcela();
        var financiamento = Financiamento.Criar("F", 100m, new DateOnly(2026, 6, 1), contaId, despesa.Id);

        _parcelaRepo.ObterPorIdAsync(parcela.Id, Arg.Any<CancellationToken>()).Returns(parcela);
        _contaRepo.ObterPorIdAsync(parcela.ContaId, Arg.Any<CancellationToken>()).Returns(conta);
        _despesaRepo.ObterPorIdComParcelasAsync(parcela.DespesaId!.Value, Arg.Any<CancellationToken>()).Returns(despesa);
        _financiamentoRepo.ObterPorDespesaIdAsync(despesa.Id, Arg.Any<CancellationToken>()).Returns(financiamento);

        var act = async () => await _handler.Handle(new LiquidarParcelaCommand(parcela.Id, null), CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("*não pode ultrapassar o valor do financiamento*");
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_DespesaAssociadaAFinanciamento_AjustaUltimaParcelaAoValorRestante()
    {
        var contaId = Guid.NewGuid();
        var conta = Conta.Criar("Conta", 1000m);
        var despesa = Despesa.Criar(
            "Financiamento",
            contaId,
            tipo: TipoDespesa.Fixa,
            valorFixo: 80m,
            periodicidade: Periodicidade.Mensal,
            dataInicio: new DateOnly(2026, 6, 1));

        var parcelaAtual = despesa.GerarProximaParcela();
        var financiamento = Financiamento.Criar("F", 130m, new DateOnly(2026, 6, 1), contaId, despesa.Id);

        _parcelaRepo.ObterPorIdAsync(parcelaAtual.Id, Arg.Any<CancellationToken>()).Returns(parcelaAtual);
        _contaRepo.ObterPorIdAsync(parcelaAtual.ContaId, Arg.Any<CancellationToken>()).Returns(conta);
        _despesaRepo.ObterPorIdComParcelasAsync(parcelaAtual.DespesaId!.Value, Arg.Any<CancellationToken>()).Returns(despesa);
        _financiamentoRepo.ObterPorDespesaIdAsync(despesa.Id, Arg.Any<CancellationToken>()).Returns(financiamento);

        var result = await _handler.Handle(new LiquidarParcelaCommand(parcelaAtual.Id, null), CancellationToken.None);

        result.ValorLiquido.Should().Be(80m);
        despesa.Parcelas.Should().HaveCount(2);
        despesa.Parcelas.Count(p => !p.IsPaid).Should().Be(1);
        despesa.Parcelas.Single(p => !p.IsPaid).ValorLiquido.Should().Be(50m);
    }
}
