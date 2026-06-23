using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Domain.Tests;

public class ColaboradorTests
{
    [Fact]
    public void CriarComercial_DadosValidos_RetornaColaborador()
    {
        var colaborador = Colaborador.CriarComercial("Ana Silva", 15m, 5m);

        colaborador.Nome.Should().Be("Ana Silva");
        colaborador.Tipo.Should().Be(TipoColaborador.Comercial);
        colaborador.PercentagemVenda.Should().Be(15m);
        colaborador.PercentagemAngariacao.Should().Be(5m);
        colaborador.IsDeleted.Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void CriarComercial_NomeVazio_LancaDomainException(string nome)
    {
        var act = () => Colaborador.CriarComercial(nome, 10m, 10m);

        act.Should().Throw<DomainException>();
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void CriarServico_PercentagemForaDeIntervalo_LancaDomainException(decimal pct)
    {
        var act = () => Colaborador.CriarServico("Ana", pct);

        act.Should().Throw<DomainException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(100)]
    public void CriarServico_PercentagemNosLimites_Sucesso(decimal pct)
    {
        var act = () => Colaborador.CriarServico("Ana", pct);

        act.Should().NotThrow();
    }

    [Fact]
    public void Deletar_ColaboradorAtivo_MarcaComoRemovido()
    {
        var colaborador = Colaborador.CriarServico("Ana", 10m);

        colaborador.Deletar();

        colaborador.IsDeleted.Should().BeTrue();
    }

    [Fact]
    public void Deletar_ColaboradorJaRemovido_NaoLancaExcecao()
    {
        var colaborador = Colaborador.CriarServico("Ana", 10m);
        colaborador.Deletar();

        var act = () => colaborador.Deletar();

        act.Should().NotThrow();
    }
}
