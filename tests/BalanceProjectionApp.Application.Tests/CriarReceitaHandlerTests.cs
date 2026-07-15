using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Colaboradores.Common;
using BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
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
    private readonly IDespesaRepository _despesaRepo = Substitute.For<IDespesaRepository>();
    private readonly IComissaoDespesaSincronizador _comissaoSincronizador = Substitute.For<IComissaoDespesaSincronizador>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly CriarReceitaCommandHandler _handler;

    private static readonly Guid ContaId = Guid.NewGuid();
    private static readonly DateOnly Vencimento = new(2026, 6, 1);

    public CriarReceitaHandlerTests()
    {
        _handler = new CriarReceitaCommandHandler(_receitaRepo, _contaRepo, _colaboradorRepo, _despesaRepo, _comissaoSincronizador, _uow);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>())
            .Returns(Conta.Criar("Conta", 0m));
    }

    [Fact]
    public async Task Handle_DadosValidos_AdicionaReceitaERetornaId()
    {
        var command = new CriarReceitaCommand(
            "Proj ABC",
            ContaId,
            null,
            Parcelas: [new(1, Vencimento, 5_000m)]);

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
            new CriarReceitaCommand(
                "Proj",
                Guid.NewGuid(),
                null,
                Parcelas: [new(1, Vencimento, 1_000m)]),
            CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
        await _receitaRepo.DidNotReceive().AdicionarAsync(Arg.Any<Receita>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ComColaborador_AssociaColaboradorNaReceita()
    {
        var colaboradorId = Guid.NewGuid();
        var colaborador = Colaborador.CriarServico("Ana", 10m);
        _colaboradorRepo.ObterPorIdAsync(colaboradorId, Arg.Any<CancellationToken>())
            .Returns(colaborador);

        Receita? receitaCriada = null;
        await _receitaRepo.AdicionarAsync(Arg.Do<Receita>(r => receitaCriada = r), Arg.Any<CancellationToken>());

        await _handler.Handle(
            new CriarReceitaCommand(
                "Proj",
                ContaId,
                null,
                Parcelas: [new(1, Vencimento, 10_000m)],
                Comissoes: [new(colaboradorId, TipoComissao.Servico, 10m)]),
            CancellationToken.None);

        receitaCriada!.Comissoes.Should().HaveCount(1);
        receitaCriada.Comissoes.Single().Percentagem.Should().Be(10m);
    }

    [Fact]
    public async Task Handle_ColaboradorNaoExiste_LancaEntityNotFoundException()
    {
        var colaboradorId = Guid.NewGuid();
        _colaboradorRepo.ObterPorIdAsync(colaboradorId, Arg.Any<CancellationToken>())
            .Returns((Colaborador?)null);

        var act = async () => await _handler.Handle(
            new CriarReceitaCommand(
                "Proj",
                ContaId,
                null,
                Parcelas: [new(1, Vencimento, 5_000m)],
                Comissoes: [new(colaboradorId, TipoComissao.Servico, 10m)]),
            CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
    }

    [Fact]
    public async Task Handle_MultiplasParcelas_AdicionaTodasNaOrdemCorreta()
    {
        Receita? receitaCriada = null;
        await _receitaRepo.AdicionarAsync(Arg.Do<Receita>(r => receitaCriada = r), Arg.Any<CancellationToken>());

        await _handler.Handle(
            new CriarReceitaCommand(
                "Proj",
                ContaId,
                null,
                Parcelas: [
                    new(2, Vencimento.AddMonths(1), 6_000m),
                    new(1, Vencimento, 4_000m),
                ]),
            CancellationToken.None);

        receitaCriada!.Parcelas.Should().HaveCount(2);
        receitaCriada.Parcelas.Select(p => p.Numero).Should().BeEquivalentTo([1, 2]);
    }

    [Fact]
    public async Task Handle_TemIvaUmaParcela_CriaUmaDespesaIvaComParcelaCorreta()
    {
        Despesa? despesaIva = null;
        await _despesaRepo.AdicionarAsync(Arg.Do<Despesa>(d => despesaIva = d), Arg.Any<CancellationToken>());

        await _handler.Handle(
            new CriarReceitaCommand(
                "Proj",
                ContaId,
                null,
                Parcelas: [new(1, new DateOnly(2026, 5, 10), 1_000m)],
                TemIva: true),
            CancellationToken.None);

        despesaIva.Should().NotBeNull();
        despesaIva!.Categoria.Should().Be(CategoriaContrato.IVA);
        despesaIva.Parcelas.Should().HaveCount(1);
        despesaIva.Parcelas.Single().ValorBruto.Should().Be(230m);
        despesaIva.Parcelas.Single().DataVencimento.Should().Be(new DateOnly(2026, 5, 25));
    }

    [Fact]
    public async Task Handle_TemIva_ParcelaDia25_VencimentoNoMesSeguinte()
    {
        Despesa? despesaIva = null;
        await _despesaRepo.AdicionarAsync(Arg.Do<Despesa>(d => despesaIva = d), Arg.Any<CancellationToken>());

        await _handler.Handle(
            new CriarReceitaCommand(
                "Proj",
                ContaId,
                null,
                Parcelas: [new(1, new DateOnly(2026, 5, 25), 1_000m)],
                TemIva: true),
            CancellationToken.None);

        despesaIva!.Parcelas.Single().DataVencimento.Should().Be(new DateOnly(2026, 6, 25));
    }

    [Fact]
    public async Task Handle_TemIvaMultiplasParcelas_CriaParcelaIvaPorCadaParcela()
    {
        Despesa? despesaIva = null;
        await _despesaRepo.AdicionarAsync(Arg.Do<Despesa>(d => despesaIva = d), Arg.Any<CancellationToken>());

        await _handler.Handle(
            new CriarReceitaCommand(
                "Proj",
                ContaId,
                null,
                Parcelas: [
                    new(1, new DateOnly(2026, 5, 10), 1_000m),
                    new(2, new DateOnly(2026, 6, 10), 2_000m),
                ],
                TemIva: true),
            CancellationToken.None);

        despesaIva!.Parcelas.Should().HaveCount(2);
        despesaIva.Parcelas.Sum(p => p.ValorBruto).Should().Be(690m);
    }

    [Fact]
    public async Task Handle_TemIva_VinculaDespesaIvaNaReceitaEInflaValorBruto()
    {
        Receita? receitaCriada = null;
        await _receitaRepo.AdicionarAsync(Arg.Do<Receita>(r => receitaCriada = r), Arg.Any<CancellationToken>());
        Despesa? despesaIva = null;
        await _despesaRepo.AdicionarAsync(Arg.Do<Despesa>(d => despesaIva = d), Arg.Any<CancellationToken>());

        await _handler.Handle(
            new CriarReceitaCommand(
                "Proj",
                ContaId,
                null,
                Parcelas: [new(1, Vencimento, 1_000m)],
                TemIva: true),
            CancellationToken.None);

        receitaCriada!.TemIva.Should().BeTrue();
        receitaCriada.DespesaIvaId.Should().Be(despesaIva!.Id);
        receitaCriada.Parcelas.Single().ValorBruto.Should().Be(1_230m);
    }

    [Fact]
    public async Task Handle_SemTemIva_NaoCriaDespesaNemVinculaId()
    {
        Receita? receitaCriada = null;
        await _receitaRepo.AdicionarAsync(Arg.Do<Receita>(r => receitaCriada = r), Arg.Any<CancellationToken>());

        await _handler.Handle(
            new CriarReceitaCommand(
                "Proj",
                ContaId,
                null,
                Parcelas: [new(1, Vencimento, 1_000m)]),
            CancellationToken.None);

        receitaCriada!.DespesaIvaId.Should().BeNull();
        await _despesaRepo.DidNotReceive().AdicionarAsync(Arg.Any<Despesa>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ComComissao_RecalculaDespesaDeComissaoParaOMesDaParcela()
    {
        var colaborador = Colaborador.CriarServico("Ana", 10m);
        _colaboradorRepo.ObterPorIdAsync(colaborador.Id, Arg.Any<CancellationToken>())
            .Returns(colaborador);

        await _handler.Handle(
            new CriarReceitaCommand(
                "Proj",
                ContaId,
                null,
                Parcelas: [new(1, new DateOnly(2026, 6, 15), 1_000m)],
                Comissoes: [new(colaborador.Id, TipoComissao.Servico, 10m)]),
            CancellationToken.None);

        await _comissaoSincronizador.Received(1)
            .RecalcularAsync(colaborador.Id, new DateOnly(2026, 6, 1), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_SemComissao_NaoChamaSincronizador()
    {
        await _handler.Handle(
            new CriarReceitaCommand("Proj", ContaId, null, Parcelas: [new(1, Vencimento, 1_000m)]),
            CancellationToken.None);

        await _comissaoSincronizador.DidNotReceive()
            .RecalcularAsync(Arg.Any<Guid>(), Arg.Any<DateOnly>(), Arg.Any<CancellationToken>());
    }
}
