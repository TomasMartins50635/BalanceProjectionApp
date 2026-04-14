using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Domain.Tests;

public class ReceitaTests
{
    private static readonly Guid ContaId = Guid.NewGuid();
    private static readonly DateOnly Vencimento = new(2026, 6, 1);

    // ── Criar ──────────────────────────────────────────────────────────────────

    [Fact]
    public void Criar_DadosValidos_RetornaReceita()
    {
        var receita = Receita.Criar("Projeto ABC", ContaId, 10_000m, "Consultoria");

        receita.Nome.Should().Be("Projeto ABC");
        receita.ContaId.Should().Be(ContaId);
        receita.ValorTotal.Should().Be(10_000m);
        receita.Categoria.Should().Be("Consultoria");
        receita.IsDeleted.Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Criar_NomeVazio_LancaDomainException(string nome)
    {
        var act = () => Receita.Criar(nome, ContaId, 1000m);

        act.Should().Throw<DomainException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Criar_ValorTotalNaoPositivo_LancaDomainException(decimal valor)
    {
        var act = () => Receita.Criar("Projeto", ContaId, valor);

        act.Should().Throw<DomainException>();
    }

    // ── Remover ────────────────────────────────────────────────────────────────

    [Fact]
    public void Remover_ReceitaAtiva_MarcaComoRemovida()
    {
        var receita = Receita.Criar("Projeto", ContaId, 1000m);

        receita.Remover();

        receita.IsDeleted.Should().BeTrue();
    }

    [Fact]
    public void Remover_ReceitaJaRemovida_LancaDomainException()
    {
        var receita = Receita.Criar("Projeto", ContaId, 1000m);
        receita.Remover();

        var act = () => receita.Remover();

        act.Should().Throw<DomainException>();
    }

    // ── AdicionarParcela ───────────────────────────────────────────────────────

    [Fact]
    public void AdicionarParcela_SemComissao_ValorBrutoCorreto()
    {
        var receita = Receita.Criar("Projeto", ContaId, 10_000m);

        var parcela = receita.AdicionarParcela(1, Vencimento, 40m);

        parcela.ValorBruto.Should().Be(4_000m);
        parcela.ValorLiquido.Should().Be(4_000m);
        parcela.Percentagem.Should().Be(40m);
    }

    [Fact]
    public void AdicionarParcela_ComComissao_ValorLiquidoDeduzido()
    {
        var receita = Receita.Criar("Projeto", ContaId, 10_000m);
        var colaborador = Colaborador.Criar("Ana", 10m); // 10% comissão
        receita.AssociarColaborador(colaborador);

        var parcela = receita.AdicionarParcela(1, Vencimento, 100m);

        parcela.ValorBruto.Should().Be(10_000m);
        parcela.ValorLiquido.Should().Be(9_000m); // 10_000 - 10%
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(101)]
    public void AdicionarParcela_PercentagemInvalida_LancaDomainException(decimal pct)
    {
        var receita = Receita.Criar("Projeto", ContaId, 1000m);

        var act = () => receita.AdicionarParcela(1, Vencimento, pct);

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void AdicionarParcela_NumeroRepetido_LancaDomainException()
    {
        var receita = Receita.Criar("Projeto", ContaId, 1000m);
        receita.AdicionarParcela(1, Vencimento, 50m);

        var act = () => receita.AdicionarParcela(1, Vencimento, 50m);

        act.Should().Throw<DomainException>();
    }

    // ── RemoverParcelasNaoPagas ────────────────────────────────────────────────

    [Fact]
    public void RemoverParcelasNaoPagas_MantemParcelas_LiquidadasRemoveRestantes()
    {
        var receita = Receita.Criar("Projeto", ContaId, 10_000m);
        receita.AdicionarParcela(1, Vencimento, 50m);
        receita.AdicionarParcela(2, Vencimento.AddMonths(1), 50m);
        // Liquidar parcela 1
        receita.Parcelas.First(p => p.Numero == 1).Liquidar();

        var removidos = receita.RemoverParcelasNaoPagas();

        removidos.Should().HaveCount(1);
        receita.Parcelas.Should().HaveCount(1);
        receita.Parcelas.Single().Numero.Should().Be(1);
    }
}
