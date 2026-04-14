using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Contas.Commands.CriarConta;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class CriarContaHandlerTests
{
    private readonly IContaRepository _repo = Substitute.For<IContaRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly CriarContaCommandHandler _handler;

    public CriarContaHandlerTests()
    {
        _handler = new CriarContaCommandHandler(_repo, _uow);
    }

    [Fact]
    public async Task Handle_DadosValidos_AdicionaContaERetornaId()
    {
        var command = new CriarContaCommand("Conta Principal", 500m);

        var id = await _handler.Handle(command, CancellationToken.None);

        id.Should().NotBeEmpty();
        await _repo.Received(1).AdicionarAsync(Arg.Any<Domain.Entities.Conta>(), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_DadosValidos_ContaCriadaComNomeESaldoCorretos()
    {
        Domain.Entities.Conta? contaCriada = null;
        await _repo.AdicionarAsync(Arg.Do<Domain.Entities.Conta>(c => contaCriada = c), Arg.Any<CancellationToken>());

        await _handler.Handle(new CriarContaCommand("Poupança", 1_000m), CancellationToken.None);

        contaCriada!.Nome.Should().Be("Poupança");
        contaCriada.Saldo.Should().Be(1_000m);
    }

    [Fact]
    public async Task Handle_NomeVazio_LancaDomainException()
    {
        var act = async () => await _handler.Handle(new CriarContaCommand("", 0m), CancellationToken.None);

        await act.Should().ThrowAsync<Domain.Exceptions.DomainException>();
        await _repo.DidNotReceive().AdicionarAsync(Arg.Any<Domain.Entities.Conta>(), Arg.Any<CancellationToken>());
    }
}
