using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Contas.Commands.EliminarConta;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class EliminarContaHandlerTests
{
    private readonly IContaRepository _repo = Substitute.For<IContaRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly EliminarContaCommandHandler _handler;

    public EliminarContaHandlerTests()
    {
        _handler = new EliminarContaCommandHandler(_repo, _uow);
    }

    [Fact]
    public async Task Handle_ContaSemEntidadesVinculadas_RemoveEGuarda()
    {
        var contaId = Guid.NewGuid();
        var conta = Conta.Criar("Conta", 0m);
        _repo.ObterPorIdAsync(contaId, Arg.Any<CancellationToken>()).Returns(conta);
        _repo.TemEntidadesVinculadasAsync(contaId, Arg.Any<CancellationToken>()).Returns(false);

        await _handler.Handle(new EliminarContaCommand(contaId), CancellationToken.None);

        _repo.Received(1).Remover(conta);
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ContaNaoExiste_LancaEntityNotFoundException()
    {
        _repo.ObterPorIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Conta?)null);

        var act = async () => await _handler.Handle(
            new EliminarContaCommand(Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
        _repo.DidNotReceive().Remover(Arg.Any<Conta>());
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ContaComEntidadesVinculadas_LancaDomainException()
    {
        var contaId = Guid.NewGuid();
        var conta = Conta.Criar("Conta", 500m);
        _repo.ObterPorIdAsync(contaId, Arg.Any<CancellationToken>()).Returns(conta);
        _repo.TemEntidadesVinculadasAsync(contaId, Arg.Any<CancellationToken>()).Returns(true);

        var act = async () => await _handler.Handle(
            new EliminarContaCommand(contaId), CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("*receitas*");
        _repo.DidNotReceive().Remover(Arg.Any<Conta>());
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
