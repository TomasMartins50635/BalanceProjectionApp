using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Domain.Tests;

public class ColaboradorTests
{
    [Fact]
    public void Criar_DadosValidos_RetornaColaborador()
    {
        var colaborador = Colaborador.Criar("Ana Silva", 15m);

        colaborador.Nome.Should().Be("Ana Silva");
        colaborador.Percentagem.Should().Be(15m);
        colaborador.IsDeleted.Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Criar_NomeVazio_LancaDomainException(string nome)
    {
        var act = () => Colaborador.Criar(nome, 10m);

        act.Should().Throw<DomainException>();
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void Criar_PercentagemForaDeIntervalo_LancaDomainException(decimal pct)
    {
        var act = () => Colaborador.Criar("Ana", pct);

        act.Should().Throw<DomainException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(100)]
    public void Criar_PercentagemNosLimites_Sucesso(decimal pct)
    {
        var act = () => Colaborador.Criar("Ana", pct);

        act.Should().NotThrow();
    }

    [Fact]
    public void Deletar_ColaboradorAtivo_MarcaComoRemovido()
    {
        var colaborador = Colaborador.Criar("Ana", 10m);

        colaborador.Deletar();

        colaborador.IsDeleted.Should().BeTrue();
    }

    [Fact]
    public void Deletar_ColaboradorJaRemovido_NaoLancaExcecao()
    {
        var colaborador = Colaborador.Criar("Ana", 10m);
        colaborador.Deletar();

        var act = () => colaborador.Deletar();

        act.Should().NotThrow();
    }
}
