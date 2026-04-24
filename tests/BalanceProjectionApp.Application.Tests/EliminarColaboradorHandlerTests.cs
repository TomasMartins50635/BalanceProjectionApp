using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Colaboradores.Commands.EliminarColaborador;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class EliminarColaboradorHandlerTests
{
    private readonly IColaboradorRepository _repo = Substitute.For<IColaboradorRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly EliminarColaboradorCommandHandler _handler;

    public EliminarColaboradorHandlerTests()
    {
        _handler = new EliminarColaboradorCommandHandler(_repo, _uow);
    }

    [Fact]
    public async Task Handle_ColaboradorAtivo_DesativaEGuarda()
    {
        var colaboradorId = Guid.NewGuid();
        var colaborador = Colaborador.Criar("Ana", 10m);
        _repo.ObterPorIdAsync(colaboradorId, Arg.Any<CancellationToken>()).Returns(colaborador);

        await _handler.Handle(new EliminarColaboradorCommand(colaboradorId), CancellationToken.None);

        colaborador.IsDeleted.Should().BeTrue();
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ColaboradorNaoExiste_LancaEntityNotFoundException()
    {
        _repo.ObterPorIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Colaborador?)null);

        var act = async () => await _handler.Handle(
            new EliminarColaboradorCommand(Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ColaboradorJaDesativado_NaoLancaExcecaoEGuarda()
    {
        var colaboradorId = Guid.NewGuid();
        var colaborador = Colaborador.Criar("Ana", 10m);
        colaborador.Deletar(); // já desativado
        _repo.ObterPorIdAsync(colaboradorId, Arg.Any<CancellationToken>()).Returns(colaborador);

        await _handler.Handle(new EliminarColaboradorCommand(colaboradorId), CancellationToken.None);

        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
