using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Domain.Tests;

public class ParcelaTests
{
    private static readonly Guid ContaId = Guid.NewGuid();
    private static readonly DateOnly Vencimento = new(2026, 6, 1);

    private static Parcela CriarParcelaReceita(decimal valorBruto = 1000m, decimal valorLiquido = 1000m)
    {
        var receita = Receita.Criar("Proj", ContaId);
        return receita.AdicionarParcela(1, Vencimento, valorBruto);
    }

    // ── Liquidar ───────────────────────────────────────────────────────────────

    [Fact]
    public void Liquidar_ParcelaPendente_MarcaComoPaga()
    {
        var parcela = CriarParcelaReceita();

        parcela.Liquidar();

        parcela.IsPaid.Should().BeTrue();
        parcela.DataPagamento.Should().NotBeNull();
    }

    [Fact]
    public void Liquidar_ComDataEspecifica_UsaDataFornecida()
    {
        var parcela = CriarParcelaReceita();
        var data = new DateOnly(2026, 5, 15);

        parcela.Liquidar(data);

        parcela.DataPagamento.Should().Be(data.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
    }

    [Fact]
    public void Liquidar_SemData_UsaDataDeHoje()
    {
        var parcela = CriarParcelaReceita();
        var antes = DateTime.UtcNow.Date;

        parcela.Liquidar();

        parcela.DataPagamento!.Value.Date.Should().Be(antes);
    }

    [Fact]
    public void Liquidar_ParcelaJaLiquidada_LancaDomainException()
    {
        var parcela = CriarParcelaReceita();
        parcela.Liquidar();

        var act = () => parcela.Liquidar();

        act.Should().Throw<DomainException>();
    }

    // ── EReceita ───────────────────────────────────────────────────────────────

    [Fact]
    public void EReceita_ParcelaDeReceita_RetornaTrue()
    {
        var parcela = CriarParcelaReceita();

        parcela.EReceita().Should().BeTrue();
    }

    [Fact]
    public void EReceita_ParcelaDeDespesa_RetornaFalse()
    {
        var despesa = Despesa.Criar("Renda", ContaId);
        var parcela = despesa.AdicionarParcela(1, Vencimento, 500m);

        parcela.EReceita().Should().BeFalse();
    }
}
