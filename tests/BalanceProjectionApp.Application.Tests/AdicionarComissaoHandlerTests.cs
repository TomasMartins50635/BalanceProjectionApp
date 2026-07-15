using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Colaboradores.Common;
using BalanceProjectionApp.Application.Features.Receitas.Commands.AdicionarComissao;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class AdicionarComissaoHandlerTests
{
    private readonly IReceitaRepository _receitaRepo = Substitute.For<IReceitaRepository>();
    private readonly IColaboradorRepository _colaboradorRepo = Substitute.For<IColaboradorRepository>();
    private readonly IComissaoDespesaSincronizador _comissaoSincronizador = Substitute.For<IComissaoDespesaSincronizador>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly AdicionarComissaoCommandHandler _handler;

    private static readonly Guid ContaId = Guid.NewGuid();

    public AdicionarComissaoHandlerTests()
    {
        _handler = new AdicionarComissaoCommandHandler(_receitaRepo, _colaboradorRepo, _comissaoSincronizador, _uow);
    }

    [Fact]
    public async Task Handle_ReceitaNaoExiste_LancaEntityNotFoundException()
    {
        _receitaRepo.ObterPorIdComParcelasAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((Receita?)null);

        var act = async () => await _handler.Handle(
            new AdicionarComissaoCommand(Guid.NewGuid(), Guid.NewGuid(), TipoComissao.Servico, 10m),
            CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
    }

    [Fact]
    public async Task Handle_DadosValidos_AdicionaComissaoERecalculaMesesDasParcelas()
    {
        var receitaId = Guid.NewGuid();
        var colaborador = Colaborador.CriarServico("Ana", 10m);
        var receita = Receita.Criar("Proj", ContaId);
        receita.AdicionarParcela(1, new DateOnly(2026, 6, 15), 1_000m);
        receita.AdicionarParcela(2, new DateOnly(2026, 7, 15), 1_000m);
        _receitaRepo.ObterPorIdComParcelasAsync(receitaId, Arg.Any<CancellationToken>()).Returns(receita);
        _colaboradorRepo.ObterPorIdAsync(colaborador.Id, Arg.Any<CancellationToken>()).Returns(colaborador);

        var id = await _handler.Handle(
            new AdicionarComissaoCommand(receitaId, colaborador.Id, TipoComissao.Servico, 10m),
            CancellationToken.None);

        id.Should().NotBeEmpty();
        receita.Comissoes.Should().ContainSingle();
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        await _comissaoSincronizador.Received(1)
            .RecalcularAsync(colaborador.Id, new DateOnly(2026, 6, 1), Arg.Any<CancellationToken>());
        await _comissaoSincronizador.Received(1)
            .RecalcularAsync(colaborador.Id, new DateOnly(2026, 7, 1), Arg.Any<CancellationToken>());
    }
}
