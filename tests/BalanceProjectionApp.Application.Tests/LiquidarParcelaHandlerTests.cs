using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Parcelas.Commands.LiquidarParcela;
using BalanceProjectionApp.Domain.Entities;
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
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly LiquidarParcelaCommandHandler _handler;

    private static readonly DateOnly Vencimento = new(2026, 6, 1);

    public LiquidarParcelaHandlerTests()
    {
        _handler = new LiquidarParcelaCommandHandler(_parcelaRepo, _contaRepo, _uow);
    }

    private static (Parcela parcela, Conta conta) CriarParcelaReceita(decimal valorTotal = 10_000m)
    {
        var contaId = Guid.NewGuid();
        var conta = Conta.Criar("Conta", 0m);
        var receita = Receita.Criar("Proj", contaId, valorTotal);
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

    [Fact]
    public async Task Handle_ParcelaDeReceita_CreditaSaldoDaConta()
    {
        var (parcela, conta) = CriarParcelaReceita(10_000m);
        _parcelaRepo.ObterPorIdAsync(parcela.Id, Arg.Any<CancellationToken>()).Returns(parcela);
        _contaRepo.ObterPorIdAsync(parcela.ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        var result = await _handler.Handle(new LiquidarParcelaCommand(parcela.Id, null), CancellationToken.None);

        conta.Saldo.Should().Be(10_000m); // creditado
        result.NovoSaldoConta.Should().Be(10_000m);
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ParcelaDeDespesa_DebitaSaldoDaConta()
    {
        var (parcela, conta) = CriarParcelaDespesa(500m);
        _parcelaRepo.ObterPorIdAsync(parcela.Id, Arg.Any<CancellationToken>()).Returns(parcela);
        _contaRepo.ObterPorIdAsync(parcela.ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        var result = await _handler.Handle(new LiquidarParcelaCommand(parcela.Id, null), CancellationToken.None);

        conta.Saldo.Should().Be(500m); // 1000 - 500
        result.NovoSaldoConta.Should().Be(500m);
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
}
