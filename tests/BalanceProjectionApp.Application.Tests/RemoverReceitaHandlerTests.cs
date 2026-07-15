using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Colaboradores.Common;
using BalanceProjectionApp.Application.Features.Receitas.Commands.RemoverReceita;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class RemoverReceitaHandlerTests
{
    private readonly IReceitaRepository _repo = Substitute.For<IReceitaRepository>();
    private readonly IComissaoDespesaSincronizador _comissaoSincronizador = Substitute.For<IComissaoDespesaSincronizador>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly RemoverReceitaCommandHandler _handler;

    public RemoverReceitaHandlerTests()
    {
        _handler = new RemoverReceitaCommandHandler(_repo, _comissaoSincronizador, _uow);
    }

    [Fact]
    public async Task Handle_ReceitaAtiva_MarcaComoRemovidaEGuarda()
    {
        var receitaId = Guid.NewGuid();
        var receita = Receita.Criar("Proj", Guid.NewGuid());
        _repo.ObterPorIdComParcelasAsync(receitaId, Arg.Any<CancellationToken>()).Returns(receita);

        await _handler.Handle(new RemoverReceitaCommand(receitaId), CancellationToken.None);

        receita.IsDeleted.Should().BeTrue();
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ReceitaNaoExiste_LancaEntityNotFoundException()
    {
        _repo.ObterPorIdComParcelasAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Receita?)null);

        var act = async () => await _handler.Handle(
            new RemoverReceitaCommand(Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ReceitaJaRemovida_NaoLancaExcecaoEGuarda()
    {
        var receitaId = Guid.NewGuid();
        var receita = Receita.Criar("Proj", Guid.NewGuid());
        receita.Deletar(); // já removida
        _repo.ObterPorIdComParcelasAsync(receitaId, Arg.Any<CancellationToken>()).Returns(receita);

        await _handler.Handle(new RemoverReceitaCommand(receitaId), CancellationToken.None);

        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ReceitaComDespesaIvaAtiva_RemoveDespesaEDesvincula()
    {
        var receitaId = Guid.NewGuid();
        var contaId = Guid.NewGuid();
        var receita = Receita.Criar("Proj", contaId, temIva: true);
        receita.AdicionarParcela(1, new DateOnly(2026, 6, 1), 1_000m);
        var despesaIva = Despesa.Criar("IVA de Proj", contaId, CategoriaContrato.IVA, TipoDespesa.Pontual);
        despesaIva.AdicionarParcela(1, new DateOnly(2026, 6, 25), 230m);
        receita.VincularDespesaIva(despesaIva.Id);
        SetDespesaIvaNav(receita, despesaIva);
        _repo.ObterPorIdComParcelasAsync(receitaId, Arg.Any<CancellationToken>()).Returns(receita);

        await _handler.Handle(new RemoverReceitaCommand(receitaId), CancellationToken.None);

        despesaIva.IsDeleted.Should().BeTrue();
        despesaIva.Parcelas.Should().OnlyContain(p => p.IsDeleted);
        receita.DespesaIvaId.Should().BeNull();
    }

    [Fact]
    public async Task Handle_ReceitaComComissaoAtiva_RecalculaMesesDasParcelas()
    {
        var receitaId = Guid.NewGuid();
        var colaborador = Colaborador.CriarServico("Ana", 10m);
        var receita = Receita.Criar("Proj", Guid.NewGuid());
        receita.AdicionarComissao(colaborador, TipoComissao.Servico, 10m);
        receita.AdicionarParcela(1, new DateOnly(2026, 6, 15), 1_000m);
        _repo.ObterPorIdComParcelasAsync(receitaId, Arg.Any<CancellationToken>()).Returns(receita);

        await _handler.Handle(new RemoverReceitaCommand(receitaId), CancellationToken.None);

        await _comissaoSincronizador.Received(1)
            .RecalcularAsync(colaborador.Id, new DateOnly(2026, 6, 1), Arg.Any<CancellationToken>());
    }

    // A navegação DespesaIva é privada (setter EF); reflexão simula o que o Include faria.
    private static void SetDespesaIvaNav(Receita receita, Despesa despesaIva)
    {
        typeof(Receita).GetProperty(nameof(Receita.DespesaIva))!
            .SetValue(receita, despesaIva);
    }
}
