using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Colaboradores.Common;
using BalanceProjectionApp.Application.Features.Receitas.Commands.AtualizarReceita;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class AtualizarReceitaHandlerTests
{
    private readonly IReceitaRepository _receitaRepo = Substitute.For<IReceitaRepository>();
    private readonly IDespesaRepository _despesaRepo = Substitute.For<IDespesaRepository>();
    private readonly IParcelaRepository _parcelaRepo = Substitute.For<IParcelaRepository>();
    private readonly IComissaoDespesaSincronizador _comissaoSincronizador = Substitute.For<IComissaoDespesaSincronizador>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly AtualizarReceitaCommandHandler _handler;

    private static readonly Guid ContaId = Guid.NewGuid();
    private static readonly DateOnly Vencimento = new(2026, 6, 1);

    public AtualizarReceitaHandlerTests()
    {
        _handler = new AtualizarReceitaCommandHandler(_receitaRepo, _despesaRepo, _parcelaRepo, _comissaoSincronizador, _uow);
    }

    // A navegação DespesaIva é privada (setter EF); reflexão simula o que o Include faria.
    private static void SetDespesaIvaNav(Receita receita, Despesa? despesaIva)
    {
        typeof(Receita).GetProperty(nameof(Receita.DespesaIva))!
            .SetValue(receita, despesaIva);
    }

    [Fact]
    public async Task Handle_ReceitaNaoExiste_LancaEntityNotFoundException()
    {
        _receitaRepo.ObterPorIdComParcelasAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((Receita?)null);

        var act = async () => await _handler.Handle(
            new AtualizarReceitaCommand(Guid.NewGuid(), "Proj", null, [new(1, Vencimento, 1_000m)]),
            CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
    }

    [Fact]
    public async Task Handle_TemIvaFalseParaFalse_NaoMexeEmDespesas()
    {
        var receitaId = Guid.NewGuid();
        var receita = Receita.Criar("Proj", ContaId);
        _receitaRepo.ObterPorIdComParcelasAsync(receitaId, Arg.Any<CancellationToken>()).Returns(receita);

        await _handler.Handle(
            new AtualizarReceitaCommand(receitaId, "Proj", null, [new(1, Vencimento, 1_000m)], TemIva: false),
            CancellationToken.None);

        receita.DespesaIvaId.Should().BeNull();
        await _despesaRepo.DidNotReceive().AdicionarAsync(Arg.Any<Despesa>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_TemIvaFalseParaTrue_CriaDespesaEVincula()
    {
        var receitaId = Guid.NewGuid();
        var receita = Receita.Criar("Proj", ContaId);
        _receitaRepo.ObterPorIdComParcelasAsync(receitaId, Arg.Any<CancellationToken>()).Returns(receita);
        Despesa? despesaCriada = null;
        await _despesaRepo.AdicionarAsync(Arg.Do<Despesa>(d => despesaCriada = d), Arg.Any<CancellationToken>());

        await _handler.Handle(
            new AtualizarReceitaCommand(receitaId, "Proj", null, [new(1, Vencimento, 1_000m)], TemIva: true),
            CancellationToken.None);

        receita.TemIva.Should().BeTrue();
        receita.Parcelas.Single().ValorBruto.Should().Be(1_230m);
        despesaCriada.Should().NotBeNull();
        despesaCriada!.Categoria.Should().Be(CategoriaContrato.IVA);
        receita.DespesaIvaId.Should().Be(despesaCriada.Id);
    }

    [Fact]
    public async Task Handle_TemIvaTrueParaFalse_RemoveDespesaEDesvincula()
    {
        var receitaId = Guid.NewGuid();
        var receita = Receita.Criar("Proj", ContaId, temIva: true);
        receita.AdicionarParcela(1, Vencimento, 1_000m);
        var despesaIva = Despesa.Criar("IVA de Proj", ContaId, CategoriaContrato.IVA, TipoDespesa.Pontual);
        despesaIva.AdicionarParcela(1, Vencimento.AddDays(24), 230m);
        receita.VincularDespesaIva(despesaIva.Id);
        SetDespesaIvaNav(receita, despesaIva);
        _receitaRepo.ObterPorIdComParcelasAsync(receitaId, Arg.Any<CancellationToken>()).Returns(receita);

        await _handler.Handle(
            new AtualizarReceitaCommand(receitaId, "Proj", null, [new(1, Vencimento, 1_000m)], TemIva: false),
            CancellationToken.None);

        receita.DespesaIvaId.Should().BeNull();
        despesaIva.IsDeleted.Should().BeTrue();
        despesaIva.Parcelas.Should().OnlyContain(p => p.IsDeleted);
    }

    [Fact]
    public async Task Handle_TemIvaTrueParaTrue_SincronizaParcelasDaDespesaExistente()
    {
        var receitaId = Guid.NewGuid();
        var receita = Receita.Criar("Proj", ContaId, temIva: true);
        receita.AdicionarParcela(1, Vencimento, 1_000m);
        var despesaIva = Despesa.Criar("IVA de Proj", ContaId, CategoriaContrato.IVA, TipoDespesa.Pontual);
        despesaIva.AdicionarParcela(1, Vencimento.AddDays(24), 230m);
        receita.VincularDespesaIva(despesaIva.Id);
        SetDespesaIvaNav(receita, despesaIva);
        _receitaRepo.ObterPorIdComParcelasAsync(receitaId, Arg.Any<CancellationToken>()).Returns(receita);

        await _handler.Handle(
            new AtualizarReceitaCommand(receitaId, "Proj", null, [new(1, Vencimento, 2_000m)], TemIva: true),
            CancellationToken.None);

        var parcelasAtivas = despesaIva.Parcelas.Where(p => !p.IsDeleted).ToList();
        parcelasAtivas.Should().HaveCount(1);
        parcelasAtivas.Single().ValorBruto.Should().Be(460m);
        await _despesaRepo.DidNotReceive().AdicionarAsync(Arg.Any<Despesa>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_TemIvaTrueParaTrue_ParcelaIvaJaPagaNaoERemovida()
    {
        var receitaId = Guid.NewGuid();
        var receita = Receita.Criar("Proj", ContaId, temIva: true);
        receita.AdicionarParcela(1, Vencimento, 1_000m);
        var despesaIva = Despesa.Criar("IVA de Proj", ContaId, CategoriaContrato.IVA, TipoDespesa.Pontual);
        despesaIva.AdicionarParcela(1, Vencimento.AddDays(24), 230m);
        despesaIva.Parcelas.Single().Liquidar();
        receita.VincularDespesaIva(despesaIva.Id);
        SetDespesaIvaNav(receita, despesaIva);
        _receitaRepo.ObterPorIdComParcelasAsync(receitaId, Arg.Any<CancellationToken>()).Returns(receita);

        await _handler.Handle(
            new AtualizarReceitaCommand(receitaId, "Proj", null, [new(1, Vencimento, 2_000m)], TemIva: true),
            CancellationToken.None);

        despesaIva.Parcelas.Should().HaveCount(2);
        despesaIva.Parcelas.Should().ContainSingle(p => p.IsPaid && p.ValorBruto == 230m);
        despesaIva.Parcelas.Should().ContainSingle(p => !p.IsDeleted && !p.IsPaid && p.ValorBruto == 460m);
    }

    [Fact]
    public async Task Handle_ComComissaoMudaMesDaParcela_RecalculaMesAntigoEMesNovo()
    {
        var receitaId = Guid.NewGuid();
        var colaborador = Colaborador.CriarServico("Ana", 10m);
        var receita = Receita.Criar("Proj", ContaId);
        receita.AdicionarComissao(colaborador, TipoComissao.Servico, 10m);
        receita.AdicionarParcela(1, new DateOnly(2026, 6, 15), 1_000m);
        _receitaRepo.ObterPorIdComParcelasAsync(receitaId, Arg.Any<CancellationToken>()).Returns(receita);

        await _handler.Handle(
            new AtualizarReceitaCommand(receitaId, "Proj", null, [new(1, new DateOnly(2026, 7, 15), 1_000m)]),
            CancellationToken.None);

        await _comissaoSincronizador.Received(1)
            .RecalcularAsync(colaborador.Id, new DateOnly(2026, 6, 1), Arg.Any<CancellationToken>());
        await _comissaoSincronizador.Received(1)
            .RecalcularAsync(colaborador.Id, new DateOnly(2026, 7, 1), Arg.Any<CancellationToken>());
    }
}
