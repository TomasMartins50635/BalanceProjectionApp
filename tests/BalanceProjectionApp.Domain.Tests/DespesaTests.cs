using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Domain.Tests;

public class DespesaTests
{
    private static readonly Guid ContaId = Guid.NewGuid();
    private static readonly DateOnly Vencimento = new(2026, 6, 1);

    [Fact]
    public void Criar_DadosValidos_RetornaDespesa()
    {
        var despesa = Despesa.Criar("Renda", ContaId, CategoriaContrato.Aluguer);

        despesa.Nome.Should().Be("Renda");
        despesa.ContaId.Should().Be(ContaId);
        despesa.Categoria.Should().Be(CategoriaContrato.Aluguer);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Criar_NomeVazio_LancaDomainException(string nome)
    {
        var act = () => Despesa.Criar(nome, ContaId);

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void AdicionarParcela_SemComissao_ValorLiquidoIgualAoBruto()
    {
        var despesa = Despesa.Criar("Renda", ContaId);

        var parcela = despesa.AdicionarParcela(1, Vencimento, 800m);

        parcela.ValorBruto.Should().Be(800m);
        parcela.ValorLiquido.Should().Be(800m);
    }

    [Fact]
    public void AdicionarParcela_NumeroRepetido_LancaDomainException()
    {
        var despesa = Despesa.Criar("Renda", ContaId);
        despesa.AdicionarParcela(1, Vencimento, 800m);

        var act = () => despesa.AdicionarParcela(1, Vencimento, 800m);

        act.Should().Throw<DomainException>();
    }
}
