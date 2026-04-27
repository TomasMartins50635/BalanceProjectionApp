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
        var despesa = Despesa.Criar("Renda", ContaId, CategoriaContrato.Servicos);

        despesa.Nome.Should().Be("Renda");
        despesa.ContaId.Should().Be(ContaId);
        despesa.Categoria.Should().Be(CategoriaContrato.Servicos);
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
    public void Criar_Recorrente_ComValorPrevisto_RetornaDespesaComParcelaInicial()
    {
        var despesa = Despesa.Criar(
            "Assinatura", ContaId,
            tipo: TipoDespesa.Recorrente,
            valorFixo: 125.50m,
            periodicidade: Periodicidade.Mensal,
            dataInicio: new DateOnly(2026, 6, 1));

        despesa.ValorFixo.Should().Be(125.50m);
        despesa.DataInicio.Should().Be(new DateOnly(2026, 6, 1));

        var parcela = despesa.GerarProximaParcela();

        parcela.ValorBruto.Should().Be(125.50m);
        parcela.ValorLiquido.Should().Be(125.50m);
    }

    [Fact]
    public void Criar_Recorrente_SemValorPrevisto_LancaDomainException()
    {
        var act = () => Despesa.Criar(
            "Assinatura", ContaId,
            tipo: TipoDespesa.Recorrente,
            periodicidade: Periodicidade.Mensal,
            dataInicio: new DateOnly(2026, 6, 1));

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void Criar_Recorrente_SemPeriodicidade_LancaDomainException()
    {
        var act = () => Despesa.Criar(
            "Água", ContaId,
            tipo: TipoDespesa.Recorrente,
            valorFixo: 50m,
            dataInicio: new DateOnly(2026, 6, 1));

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void Criar_Recorrente_ComPeriodicidade_RetornaDespesa()
    {
        var despesa = Despesa.Criar(
            "Água", ContaId,
            tipo: TipoDespesa.Recorrente,
            valorFixo: 50m,
            periodicidade: Periodicidade.Mensal,
            dataInicio: new DateOnly(2026, 6, 1));

        despesa.Periodicidade.Should().Be(Periodicidade.Mensal);
        despesa.ValorFixo.Should().Be(50m);
    }

    [Fact]
    public void GerarProximaParcela_Recorrente_UsaPeriodicidade()
    {
        var despesa = Despesa.Criar(
            "Água", ContaId,
            tipo: TipoDespesa.Recorrente,
            valorFixo: 50m,
            periodicidade: Periodicidade.Trimestral,
            dataInicio: new DateOnly(2026, 1, 1));
        despesa.GerarProximaParcela();

        var segunda = despesa.GerarProximaParcela();

        segunda.DataVencimento.Should().Be(new DateOnly(2026, 4, 1));
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
