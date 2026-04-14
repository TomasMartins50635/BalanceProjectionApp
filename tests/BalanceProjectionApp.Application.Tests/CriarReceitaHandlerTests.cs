using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class CriarReceitaHandlerTests
{
    private readonly IReceitaRepository _receitaRepo = Substitute.For<IReceitaRepository>();
    private readonly IContaRepository _contaRepo = Substitute.For<IContaRepository>();
    private readonly IColaboradorRepository _colaboradorRepo = Substitute.For<IColaboradorRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly CriarReceitaCommandHandler _handler;

    private static readonly Guid ContaId = Guid.NewGuid();
    private static readonly DateOnly Vencimento = new(2026, 6, 1);

    public CriarReceitaHandlerTests()
    {
        _handler = new CriarReceitaCommandHandler(_receitaRepo, _contaRepo, _colaboradorRepo, _uow);

        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>())
            .Returns(Conta.Criar("Conta", 0m));
    }

    [Fact]
    public async Task Handle_DadosValidos_AdicionaReceitaERetornaId()
    {
        var command = new CriarReceitaCommand("Proj ABC", ContaId, 10_000m, null, null,
            [new(1, Vencimento, 100m)]);

        var id = await _handler.Handle(command, CancellationToken.None);

        id.Should().NotBeEmpty();
        await _receitaRepo.Received(1).AdicionarAsync(Arg.Any<Receita>(), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ContaNaoExiste_LancaEntityNotFoundException()
    {
        _contaRepo.ObterPorIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((Conta?)null);

        var act = async () => await _handler.Handle(
            new CriarReceitaCommand("Proj", Guid.NewGuid(), 1000m, null, null, [new(1, Vencimento, 100m)]),
            CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
        await _receitaRepo.DidNotReceive().AdicionarAsync(Arg.Any<Receita>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ComColaborador_AssociaColaboradorNaReceita()
    {
        var colaboradorId = Guid.NewGuid();
        var colaborador = Colaborador.Criar("Ana", 10m);
        _colaboradorRepo.ObterPorIdAsync(colaboradorId, Arg.Any<CancellationToken>())
            .Returns(colaborador);

        Receita? receitaCriada = null;
        await _receitaRepo.AdicionarAsync(Arg.Do<Receita>(r => receitaCriada = r), Arg.Any<CancellationToken>());

        await _handler.Handle(
            new CriarReceitaCommand("Proj", ContaId, 10_000m, null, colaboradorId, [new(1, Vencimento, 100m)]),
            CancellationToken.None);

        receitaCriada!.Comissao.Should().NotBeNull();
        receitaCriada.Comissao!.Percentagem.Should().Be(10m);
    }

    [Fact]
    public async Task Handle_ColaboradorNaoExiste_LancaEntityNotFoundException()
    {
        var colaboradorId = Guid.NewGuid();
        _colaboradorRepo.ObterPorIdAsync(colaboradorId, Arg.Any<CancellationToken>())
            .Returns((Colaborador?)null);

        var act = async () => await _handler.Handle(
            new CriarReceitaCommand("Proj", ContaId, 1000m, null, colaboradorId, [new(1, Vencimento, 50m)]),
            CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
    }

    [Fact]
    public async Task Handle_MultiplasParcelas_AdicionaTodasNaOrdemCorreta()
    {
        Receita? receitaCriada = null;
        await _receitaRepo.AdicionarAsync(Arg.Do<Receita>(r => receitaCriada = r), Arg.Any<CancellationToken>());

        await _handler.Handle(
            new CriarReceitaCommand("Proj", ContaId, 10_000m, null, null,
            [
                new(2, Vencimento.AddMonths(1), 60m),
                new(1, Vencimento, 40m)
            ]),
            CancellationToken.None);

        receitaCriada!.Parcelas.Should().HaveCount(2);
        receitaCriada.Parcelas.Select(p => p.Numero).Should().BeEquivalentTo([1, 2]);
    }
}
