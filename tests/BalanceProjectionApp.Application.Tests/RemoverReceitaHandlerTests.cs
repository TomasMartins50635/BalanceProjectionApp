using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Receitas.Commands.RemoverReceita;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class RemoverReceitaHandlerTests
{
    private readonly IReceitaRepository _repo = Substitute.For<IReceitaRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly RemoverReceitaCommandHandler _handler;

    public RemoverReceitaHandlerTests()
    {
        _handler = new RemoverReceitaCommandHandler(_repo, _uow);
    }

    [Fact]
    public async Task Handle_ReceitaAtiva_MarcaComoRemovidaEGuarda()
    {
        var receitaId = Guid.NewGuid();
        var receita = Receita.Criar("Proj", Guid.NewGuid(), 1000m);
        _repo.ObterPorIdAsync(receitaId, Arg.Any<CancellationToken>()).Returns(receita);

        await _handler.Handle(new RemoverReceitaCommand(receitaId), CancellationToken.None);

        receita.IsDeleted.Should().BeTrue();
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ReceitaNaoExiste_LancaEntityNotFoundException()
    {
        _repo.ObterPorIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Receita?)null);

        var act = async () => await _handler.Handle(
            new RemoverReceitaCommand(Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ReceitaJaRemovida_LancaDomainException()
    {
        var receitaId = Guid.NewGuid();
        var receita = Receita.Criar("Proj", Guid.NewGuid(), 1000m);
        receita.Remover(); // já removida
        _repo.ObterPorIdAsync(receitaId, Arg.Any<CancellationToken>()).Returns(receita);

        var act = async () => await _handler.Handle(
            new RemoverReceitaCommand(receitaId), CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>();
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
