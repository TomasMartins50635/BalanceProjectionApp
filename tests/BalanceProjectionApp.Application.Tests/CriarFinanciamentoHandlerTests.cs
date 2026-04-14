using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Financiamentos.Commands.CriarFinanciamento;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class CriarFinanciamentoHandlerTests
{
    private readonly IFinanciamentoRepository _financiamentoRepo = Substitute.For<IFinanciamentoRepository>();
    private readonly IContaRepository _contaRepo = Substitute.For<IContaRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly CriarFinanciamentoCommandHandler _handler;

    private static readonly Guid ContaId = Guid.NewGuid();
    private static readonly DateOnly Data = new(2026, 6, 1);

    public CriarFinanciamentoHandlerTests()
    {
        _handler = new CriarFinanciamentoCommandHandler(_financiamentoRepo, _contaRepo, _uow);
    }

    [Fact]
    public async Task Handle_DadosValidos_CreditaContaImediatamente()
    {
        var conta = Conta.Criar("Conta", 0m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        await _handler.Handle(new CriarFinanciamentoCommand("Empréstimo", 5_000m, Data, ContaId, null),
            CancellationToken.None);

        conta.Saldo.Should().Be(5_000m);
    }

    [Fact]
    public async Task Handle_DadosValidos_AdicionaFinanciamentoERetornaId()
    {
        var conta = Conta.Criar("Conta", 0m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        var id = await _handler.Handle(
            new CriarFinanciamentoCommand("Empréstimo", 5_000m, Data, ContaId, null),
            CancellationToken.None);

        id.Should().NotBeEmpty();
        await _financiamentoRepo.Received(1).AdicionarAsync(Arg.Any<Financiamento>(), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ContaNaoExiste_LancaEntityNotFoundException()
    {
        _contaRepo.ObterPorIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Conta?)null);

        var act = async () => await _handler.Handle(
            new CriarFinanciamentoCommand("Empréstimo", 1_000m, Data, Guid.NewGuid(), null),
            CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
        await _financiamentoRepo.DidNotReceive().AdicionarAsync(Arg.Any<Financiamento>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_VariosFinanciamentos_SaldoAcumulado()
    {
        var conta = Conta.Criar("Conta", 1_000m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        await _handler.Handle(new CriarFinanciamentoCommand("F1", 3_000m, Data, ContaId, null), CancellationToken.None);
        await _handler.Handle(new CriarFinanciamentoCommand("F2", 2_000m, Data, ContaId, null), CancellationToken.None);

        conta.Saldo.Should().Be(6_000m); // 1000 + 3000 + 2000
    }
}
