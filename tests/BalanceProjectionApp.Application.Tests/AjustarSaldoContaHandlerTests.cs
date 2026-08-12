using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Contas.Commands.AjustarSaldoConta;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class AjustarSaldoContaHandlerTests
{
    private readonly IContaRepository _repo = Substitute.For<IContaRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly AjustarSaldoContaCommandHandler _handler;

    public AjustarSaldoContaHandlerTests()
    {
        _handler = new AjustarSaldoContaCommandHandler(_repo, _uow);
    }

    [Fact]
    public async Task Handle_ContaExistente_DefineSaldoEGuarda()
    {
        var contaId = Guid.NewGuid();
        var conta = Conta.Criar("Conta", 500m);
        _repo.ObterPorIdAsync(contaId, Arg.Any<CancellationToken>()).Returns(conta);

        await _handler.Handle(new AjustarSaldoContaCommand(contaId, 1234.56m), CancellationToken.None);

        conta.Saldo.Should().Be(1234.56m);
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ContaNaoExiste_LancaEntityNotFoundException()
    {
        _repo.ObterPorIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Conta?)null);

        var act = async () => await _handler.Handle(
            new AjustarSaldoContaCommand(Guid.NewGuid(), 100m), CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
