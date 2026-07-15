using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Infrastructure.Persistence.Repositories;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Infrastructure.Tests;

[Collection("Database")]
public class DespesaRepositoryTests(PostgresFixture db) : IAsyncLifetime
{
    public async Task InitializeAsync() => await db.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private static readonly DateOnly Mes = new(2026, 6, 1);

    private async Task<(Conta Conta, Colaborador Colaborador)> SeedContaEColaboradorAsync()
    {
        var conta = Conta.Criar("Conta", 0m);
        var colaborador = Colaborador.CriarServico("Ana", 10m);
        await using var ctx = db.CreateContext();
        await ctx.Contas.AddAsync(conta);
        await ctx.Colaboradores.AddAsync(colaborador);
        await ctx.SaveChangesAsync();
        return (conta, colaborador);
    }

    [Fact]
    public async Task ObterPorColaboradorEMes_DespesaExistente_RetornaComParcelas()
    {
        var (conta, colaborador) = await SeedContaEColaboradorAsync();
        var despesa = Despesa.Criar("Comissão de Ana — Junho 2026", conta.Id, CategoriaContrato.Comissao,
            TipoDespesa.Pontual, colaboradorId: colaborador.Id, mesReferencia: Mes);
        despesa.AdicionarParcela(1, new DateOnly(2026, 6, 30), 100m);

        await using (var ctx = db.CreateContext())
        {
            await new DespesaRepository(ctx).AdicionarAsync(despesa);
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var resultado = await new DespesaRepository(readCtx).ObterPorColaboradorEMesAsync(colaborador.Id, Mes);

        resultado.Should().NotBeNull();
        resultado!.ColaboradorId.Should().Be(colaborador.Id);
        resultado.MesReferencia.Should().Be(Mes);
        resultado.Parcelas.Should().ContainSingle(p => p.ValorBruto == 100m);
    }

    [Fact]
    public async Task ObterPorColaboradorEMes_SemDespesa_RetornaNull()
    {
        var (_, colaborador) = await SeedContaEColaboradorAsync();

        await using var ctx = db.CreateContext();
        var resultado = await new DespesaRepository(ctx).ObterPorColaboradorEMesAsync(colaborador.Id, Mes);

        resultado.Should().BeNull();
    }

    [Fact]
    public async Task ObterPorColaboradorEMes_DespesaSoftDeleted_NuncaERetornada()
    {
        var (conta, colaborador) = await SeedContaEColaboradorAsync();
        var despesa = Despesa.Criar("Comissão de Ana — Junho 2026", conta.Id, CategoriaContrato.Comissao,
            TipoDespesa.Pontual, colaboradorId: colaborador.Id, mesReferencia: Mes);
        despesa.Deletar();

        await using (var ctx = db.CreateContext())
        {
            await new DespesaRepository(ctx).AdicionarAsync(despesa);
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var resultado = await new DespesaRepository(readCtx).ObterPorColaboradorEMesAsync(colaborador.Id, Mes);

        resultado.Should().BeNull();
    }
}
