using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Colaboradores.Common;
using BalanceProjectionApp.Application.Features.Receitas.Commands.RemoverComissao;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class RemoverComissaoHandlerTests
{
    private readonly IReceitaRepository _receitaRepo = Substitute.For<IReceitaRepository>();
    private readonly IComissaoDespesaSincronizador _comissaoSincronizador = Substitute.For<IComissaoDespesaSincronizador>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly RemoverComissaoCommandHandler _handler;

    private static readonly Guid ContaId = Guid.NewGuid();

    public RemoverComissaoHandlerTests()
    {
        _handler = new RemoverComissaoCommandHandler(_receitaRepo, _comissaoSincronizador, _uow);
    }

    [Fact]
    public async Task Handle_ComissaoNaoExiste_LancaEntityNotFoundException()
    {
        _receitaRepo.ObterComissaoPorIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((ReceitaComissao?)null);

        var act = async () => await _handler.Handle(
            new RemoverComissaoCommand(Guid.NewGuid(), Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
    }

    [Fact]
    public async Task Handle_ComissaoExistente_RemoveERecalculaMesesDasParcelasRestantes()
    {
        var receitaId = Guid.NewGuid();
        var colaborador = Colaborador.CriarServico("Ana", 10m);
        var receita = Receita.Criar("Proj", ContaId);
        var comissao = receita.AdicionarComissao(colaborador, TipoComissao.Servico, 10m);
        receita.AdicionarParcela(1, new DateOnly(2026, 6, 15), 1_000m);

        _receitaRepo.ObterComissaoPorIdAsync(receitaId, comissao.Id, Arg.Any<CancellationToken>()).Returns(comissao);
        _receitaRepo.ObterPorIdComParcelasAsync(receitaId, Arg.Any<CancellationToken>()).Returns(receita);

        await _handler.Handle(new RemoverComissaoCommand(receitaId, comissao.Id), CancellationToken.None);

        comissao.IsDeleted.Should().BeTrue();
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        await _comissaoSincronizador.Received(1)
            .RecalcularAsync(colaborador.Id, new DateOnly(2026, 6, 1), Arg.Any<CancellationToken>());
    }
}
