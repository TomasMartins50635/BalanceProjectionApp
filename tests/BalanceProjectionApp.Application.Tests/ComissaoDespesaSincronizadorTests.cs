using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Colaboradores.Common;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class ComissaoDespesaSincronizadorTests
{
    private readonly IColaboradorRepository _colaboradorRepo = Substitute.For<IColaboradorRepository>();
    private readonly IDespesaRepository _despesaRepo = Substitute.For<IDespesaRepository>();
    private readonly IParcelaRepository _parcelaRepo = Substitute.For<IParcelaRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly ComissaoDespesaSincronizador _sincronizador;

    private static readonly Guid ContaId = Guid.NewGuid();
    private static readonly DateOnly Mes = new(2026, 6, 1);

    public ComissaoDespesaSincronizadorTests()
    {
        _sincronizador = new ComissaoDespesaSincronizador(_colaboradorRepo, _despesaRepo, _parcelaRepo, _uow);
    }

    // A navegação ReceitaComissao.Receita é privada (setter EF); reflexão simula o que o Include faria.
    private static ReceitaComissao ComissaoContribuinte(Colaborador colaborador, decimal percentagem, decimal valorParcela, DateOnly vencimento)
    {
        var receita = Receita.Criar("Proj", ContaId);
        var comissao = receita.AdicionarComissao(colaborador, TipoComissao.Servico, percentagem);
        receita.AdicionarParcela(1, vencimento, valorParcela);

        typeof(ReceitaComissao).GetProperty(nameof(ReceitaComissao.Receita))!.SetValue(comissao, receita);
        return comissao;
    }

    [Fact]
    public async Task RecalcularAsync_SemDespesaExistenteComTotal_CriaDespesaNaContaDaPrimeiraReceita()
    {
        var colaborador = Colaborador.CriarServico("Ana", 10m);
        _colaboradorRepo.ObterPorIdAsync(colaborador.Id, Arg.Any<CancellationToken>()).Returns(colaborador);

        var comissao = ComissaoContribuinte(colaborador, 10m, 1_000m, new DateOnly(2026, 6, 15));
        _colaboradorRepo.ListarComissoesAsync(colaborador.Id, Arg.Any<CancellationToken>()).Returns([comissao]);
        _despesaRepo.ObterPorColaboradorEMesAsync(colaborador.Id, Mes, Arg.Any<CancellationToken>()).Returns((Despesa?)null);

        Despesa? despesaCriada = null;
        await _despesaRepo.AdicionarAsync(Arg.Do<Despesa>(d => despesaCriada = d), Arg.Any<CancellationToken>());

        await _sincronizador.RecalcularAsync(colaborador.Id, Mes, CancellationToken.None);

        despesaCriada.Should().NotBeNull();
        despesaCriada!.ContaId.Should().Be(ContaId);
        despesaCriada.ColaboradorId.Should().Be(colaborador.Id);
        despesaCriada.MesReferencia.Should().Be(Mes);
        despesaCriada.Parcelas.Single().ValorBruto.Should().Be(100m); // 1000 * 10%
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RecalcularAsync_SemDespesaExistenteSemContribuicoes_NaoCriaNada()
    {
        var colaborador = Colaborador.CriarServico("Ana", 10m);
        _colaboradorRepo.ObterPorIdAsync(colaborador.Id, Arg.Any<CancellationToken>()).Returns(colaborador);
        _colaboradorRepo.ListarComissoesAsync(colaborador.Id, Arg.Any<CancellationToken>()).Returns([]);
        _despesaRepo.ObterPorColaboradorEMesAsync(colaborador.Id, Mes, Arg.Any<CancellationToken>()).Returns((Despesa?)null);

        await _sincronizador.RecalcularAsync(colaborador.Id, Mes, CancellationToken.None);

        await _despesaRepo.DidNotReceive().AdicionarAsync(Arg.Any<Despesa>(), Arg.Any<CancellationToken>());
        await _uow.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RecalcularAsync_DespesaExistenteComNovoTotal_SubstituiParcelaNaoLiquidada()
    {
        var colaborador = Colaborador.CriarServico("Ana", 10m);
        _colaboradorRepo.ObterPorIdAsync(colaborador.Id, Arg.Any<CancellationToken>()).Returns(colaborador);

        var comissao = ComissaoContribuinte(colaborador, 10m, 2_000m, new DateOnly(2026, 6, 10));
        _colaboradorRepo.ListarComissoesAsync(colaborador.Id, Arg.Any<CancellationToken>()).Returns([comissao]);

        var despesaExistente = Despesa.Criar("Comissão de Ana — Junho 2026", ContaId, CategoriaContrato.Comissao,
            TipoDespesa.Pontual, colaboradorId: colaborador.Id, mesReferencia: Mes);
        despesaExistente.AdicionarParcela(1, new DateOnly(2026, 6, 30), 100m);
        _despesaRepo.ObterPorColaboradorEMesAsync(colaborador.Id, Mes, Arg.Any<CancellationToken>()).Returns(despesaExistente);

        Parcela? novaParcela = null;
        await _parcelaRepo.AdicionarAsync(Arg.Do<Parcela>(p => novaParcela = p), Arg.Any<CancellationToken>());

        await _sincronizador.RecalcularAsync(colaborador.Id, Mes, CancellationToken.None);

        novaParcela.Should().NotBeNull();
        novaParcela!.ValorBruto.Should().Be(200m); // 2000 * 10%
        despesaExistente.Parcelas.Where(p => !p.IsDeleted).Should().ContainSingle();
        despesaExistente.IsDeleted.Should().BeFalse();
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RecalcularAsync_DespesaExistenteSemContribuicoesENuncaPaga_SoftDeletaDespesa()
    {
        var colaborador = Colaborador.CriarServico("Ana", 10m);
        _colaboradorRepo.ObterPorIdAsync(colaborador.Id, Arg.Any<CancellationToken>()).Returns(colaborador);
        _colaboradorRepo.ListarComissoesAsync(colaborador.Id, Arg.Any<CancellationToken>()).Returns([]);

        var despesaExistente = Despesa.Criar("Comissão de Ana — Junho 2026", ContaId, CategoriaContrato.Comissao,
            TipoDespesa.Pontual, colaboradorId: colaborador.Id, mesReferencia: Mes);
        despesaExistente.AdicionarParcela(1, new DateOnly(2026, 6, 30), 100m);
        _despesaRepo.ObterPorColaboradorEMesAsync(colaborador.Id, Mes, Arg.Any<CancellationToken>()).Returns(despesaExistente);

        await _sincronizador.RecalcularAsync(colaborador.Id, Mes, CancellationToken.None);

        despesaExistente.IsDeleted.Should().BeTrue();
        await _parcelaRepo.DidNotReceive().AdicionarAsync(Arg.Any<Parcela>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RecalcularAsync_DespesaExistenteSemContribuicoesMasComParcelaPaga_NaoSoftDeletaDespesa()
    {
        var colaborador = Colaborador.CriarServico("Ana", 10m);
        _colaboradorRepo.ObterPorIdAsync(colaborador.Id, Arg.Any<CancellationToken>()).Returns(colaborador);
        _colaboradorRepo.ListarComissoesAsync(colaborador.Id, Arg.Any<CancellationToken>()).Returns([]);

        var despesaExistente = Despesa.Criar("Comissão de Ana — Junho 2026", ContaId, CategoriaContrato.Comissao,
            TipoDespesa.Pontual, colaboradorId: colaborador.Id, mesReferencia: Mes);
        var parcelaPaga = despesaExistente.AdicionarParcela(1, new DateOnly(2026, 6, 30), 100m);
        parcelaPaga.Liquidar();
        _despesaRepo.ObterPorColaboradorEMesAsync(colaborador.Id, Mes, Arg.Any<CancellationToken>()).Returns(despesaExistente);

        await _sincronizador.RecalcularAsync(colaborador.Id, Mes, CancellationToken.None);

        despesaExistente.IsDeleted.Should().BeFalse();
        despesaExistente.Parcelas.Should().ContainSingle(p => p.IsPaid);
        await _parcelaRepo.DidNotReceive().AdicionarAsync(Arg.Any<Parcela>(), Arg.Any<CancellationToken>());
    }
}
