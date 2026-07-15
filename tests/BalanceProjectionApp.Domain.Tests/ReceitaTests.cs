using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Domain.Tests;

public class ReceitaTests
{
    private static readonly Guid ContaId = Guid.NewGuid();
    private static readonly DateOnly Vencimento = new(2026, 6, 1);

    [Fact]
    public void Criar_DadosValidos_RetornaReceita()
    {
        var receita = Receita.Criar("Projeto ABC", ContaId, CategoriaReceita.Vendas);

        receita.Nome.Should().Be("Projeto ABC");
        receita.ContaId.Should().Be(ContaId);
        receita.Categoria.Should().Be(CategoriaReceita.Vendas);
        receita.IsDeleted.Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Criar_NomeVazio_LancaDomainException(string nome)
    {
        var act = () => Receita.Criar(nome, ContaId);

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void Deletar_ReceitaAtiva_MarcaComoRemovida()
    {
        var receita = Receita.Criar("Projeto", ContaId);
        receita.Deletar();
        receita.IsDeleted.Should().BeTrue();
    }

    [Fact]
    public void Deletar_ReceitaJaRemovida_NaoLancaExcecao()
    {
        var receita = Receita.Criar("Projeto", ContaId);
        receita.Deletar();
        var act = () => receita.Deletar();
        act.Should().NotThrow();
    }

    [Fact]
    public void AdicionarParcela_SemComissao_ValorBrutoELiquidoIguais()
    {
        var receita = Receita.Criar("Projeto", ContaId);

        var parcela = receita.AdicionarParcela(1, Vencimento, 4_000m);

        parcela.ValorBruto.Should().Be(4_000m);
        parcela.ValorLiquido.Should().Be(4_000m);
        parcela.Percentagem.Should().BeNull();
    }

    [Fact]
    public void AdicionarParcela_ComComissao_ValorLiquidoDeduzido()
    {
        var receita = Receita.Criar("Projeto", ContaId);
        var colaborador = Colaborador.CriarServico("Ana", 10m);
        receita.AdicionarComissao(colaborador, TipoComissao.Servico, 10m);

        var parcela = receita.AdicionarParcela(1, Vencimento, 10_000m);

        parcela.ValorBruto.Should().Be(10_000m);
        parcela.ValorLiquido.Should().Be(9_000m);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void AdicionarParcela_ValorInvalido_LancaDomainException(decimal valor)
    {
        var receita = Receita.Criar("Projeto", ContaId);
        var act = () => receita.AdicionarParcela(1, Vencimento, valor);
        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void AdicionarParcela_NumeroRepetido_LancaDomainException()
    {
        var receita = Receita.Criar("Projeto", ContaId);
        receita.AdicionarParcela(1, Vencimento, 1_000m);
        var act = () => receita.AdicionarParcela(1, Vencimento, 500m);
        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void RemoverParcelasNaoPagas_MantemLiquidadasRemoveRestantes()
    {
        var receita = Receita.Criar("Projeto", ContaId);
        receita.AdicionarParcela(1, Vencimento, 5_000m);
        receita.AdicionarParcela(2, Vencimento.AddMonths(1), 5_000m);
        receita.Parcelas.First(p => p.Numero == 1).Liquidar();

        var removidos = receita.RemoverParcelasNaoPagas();

        removidos.Should().HaveCount(1);
        receita.Parcelas.Count(p => !p.IsDeleted).Should().Be(1);
        receita.Parcelas.Single(p => !p.IsDeleted).Numero.Should().Be(1);
    }

    [Fact]
    public void AdicionarParcela_ComTemIva_ValorBrutoInfladoValorLiquidoPreIva()
    {
        var receita = Receita.Criar("Projeto", ContaId, temIva: true);
        var colaborador = Colaborador.CriarServico("Ana", 10m);
        receita.AdicionarComissao(colaborador, TipoComissao.Servico, 10m);

        var parcela = receita.AdicionarParcela(1, Vencimento, 10_000m);

        parcela.ValorBruto.Should().Be(12_300m);
        parcela.ValorLiquido.Should().Be(9_000m);
    }

    [Fact]
    public void AdicionarParcela_SemTemIva_ValorBrutoIgualAoIndicado()
    {
        var receita = Receita.Criar("Projeto", ContaId, temIva: false);

        var parcela = receita.AdicionarParcela(1, Vencimento, 1_000m);

        parcela.ValorBruto.Should().Be(1_000m);
    }

    [Fact]
    public void Atualizar_AlteraTemIva()
    {
        var receita = Receita.Criar("Projeto", ContaId, temIva: false);

        receita.Atualizar("Projeto", null, true);

        receita.TemIva.Should().BeTrue();
    }

    [Fact]
    public void VincularDesvincularDespesaIva_DefineELimpaDespesaIvaId()
    {
        var receita = Receita.Criar("Projeto", ContaId, temIva: true);
        var despesaId = Guid.NewGuid();

        receita.VincularDespesaIva(despesaId);
        receita.DespesaIvaId.Should().Be(despesaId);

        receita.DesvincularDespesaIva();
        receita.DespesaIvaId.Should().BeNull();
    }
}
