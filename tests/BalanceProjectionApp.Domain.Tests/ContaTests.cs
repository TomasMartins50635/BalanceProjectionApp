using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Domain.Tests;

public class ContaTests
{
    // ── Criar ──────────────────────────────────────────────────────────────────

    [Fact]
    public void Criar_ComNomeValido_RetornaConta()
    {
        var conta = Conta.Criar("Conta Principal", 1000m);

        conta.Nome.Should().Be("Conta Principal");
        conta.Saldo.Should().Be(1000m);
        conta.Id.Should().NotBeEmpty();
    }

    [Fact]
    public void Criar_SemSaldoInicial_SaldoZero()
    {
        var conta = Conta.Criar("Conta");

        conta.Saldo.Should().Be(0m);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Criar_NomeVazioOuEspacos_LancaDomainException(string nome)
    {
        var act = () => Conta.Criar(nome);

        act.Should().Throw<DomainException>();
    }

    // ── Creditar ───────────────────────────────────────────────────────────────

    [Fact]
    public void Creditar_ValorPositivo_AumentaSaldo()
    {
        var conta = Conta.Criar("Conta", 500m);

        conta.Creditar(200m);

        conta.Saldo.Should().Be(700m);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Creditar_ValorNaoPositivo_LancaDomainException(decimal valor)
    {
        var conta = Conta.Criar("Conta", 500m);

        var act = () => conta.Creditar(valor);

        act.Should().Throw<DomainException>();
    }

    // ── Debitar ────────────────────────────────────────────────────────────────

    [Fact]
    public void Debitar_ValorPositivo_DiminuiSaldo()
    {
        var conta = Conta.Criar("Conta", 500m);

        conta.Debitar(200m);

        conta.Saldo.Should().Be(300m);
    }

    [Fact]
    public void Debitar_ValorSuperiorAoSaldo_SaldoFicaNegativo()
    {
        var conta = Conta.Criar("Conta", 100m);

        conta.Debitar(300m);

        conta.Saldo.Should().Be(-200m);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-50)]
    public void Debitar_ValorNaoPositivo_LancaDomainException(decimal valor)
    {
        var conta = Conta.Criar("Conta", 500m);

        var act = () => conta.Debitar(valor);

        act.Should().Throw<DomainException>();
    }

    // ── AjustarSaldo ───────────────────────────────────────────────────────────

    [Theory]
    [InlineData(1000)]
    [InlineData(0)]
    [InlineData(-250)]
    public void AjustarSaldo_QualquerValor_DefineSaldoDiretamente(decimal novoSaldo)
    {
        var conta = Conta.Criar("Conta", 500m);

        conta.AjustarSaldo(novoSaldo);

        conta.Saldo.Should().Be(novoSaldo);
    }
}
