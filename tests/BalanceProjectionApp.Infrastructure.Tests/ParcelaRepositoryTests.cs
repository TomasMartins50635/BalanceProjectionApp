using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Infrastructure.Persistence.Repositories;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Infrastructure.Tests;

[Collection("Database")]
public class ParcelaRepositoryTests(PostgresFixture db) : IAsyncLifetime
{
    public async Task InitializeAsync() => await db.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private static readonly DateOnly Janeiro = new(2026, 1, 1);
    private static readonly DateOnly Fevereiro = new(2026, 2, 1);
    private static readonly DateOnly Marco = new(2026, 3, 1);

    private async Task<Conta> SeedContaAsync()
    {
        var conta = Conta.Criar("Conta Parcelas", 1_000m);
        await using var ctx = db.CreateContext();
        await ctx.Contas.AddAsync(conta);
        await ctx.SaveChangesAsync();
        return conta;
    }

    // ── ObterPorIdAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task ObterPorId_ParcelaExistente_RetornaParcela()
    {
        var conta = await SeedContaAsync();
        var receita = Receita.Criar("Proj", conta.Id, 5_000m);
        var parcela = receita.AdicionarParcela(1, Janeiro, 100m);

        await using (var ctx = db.CreateContext())
        {
            await ctx.Receitas.AddAsync(receita);
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var resultado = await new ParcelaRepository(readCtx).ObterPorIdAsync(parcela.Id);

        resultado.Should().NotBeNull();
        resultado!.Numero.Should().Be(1);
        resultado.ValorBruto.Should().Be(5_000m);
    }

    [Fact]
    public async Task ObterPorId_IdInexistente_RetornaNull()
    {
        await using var ctx = db.CreateContext();
        var resultado = await new ParcelaRepository(ctx).ObterPorIdAsync(Guid.NewGuid());
        resultado.Should().BeNull();
    }

    // ── ListarPorContaAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task ListarPorContaAsync_RetornaParcelasDeReceitaEDespesa()
    {
        var conta = await SeedContaAsync();
        var receita = Receita.Criar("Proj", conta.Id, 10_000m);
        receita.AdicionarParcela(1, Fevereiro, 100m);
        var despesa = Despesa.Criar("Renda", conta.Id);
        despesa.AdicionarParcela(1, Marco, 500m);

        await using (var ctx = db.CreateContext())
        {
            await ctx.Receitas.AddAsync(receita);
            await ctx.Despesas.AddAsync(despesa);
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var parcelas = await new ParcelaRepository(readCtx).ListarPorContaAsync(conta.Id);

        parcelas.Should().HaveCount(2);
    }

    [Fact]
    public async Task ListarPorContaAsync_OrdenadaPorDataVencimento()
    {
        var conta = await SeedContaAsync();
        var receita = Receita.Criar("Proj", conta.Id, 10_000m);
        receita.AdicionarParcela(1, Marco, 50m);
        receita.AdicionarParcela(2, Janeiro, 50m);

        await using (var ctx = db.CreateContext())
        {
            await ctx.Receitas.AddAsync(receita);
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var parcelas = (await new ParcelaRepository(readCtx).ListarPorContaAsync(conta.Id)).ToList();

        parcelas[0].DataVencimento.Should().Be(Janeiro);
        parcelas[1].DataVencimento.Should().Be(Marco);
    }

    [Fact]
    public async Task ListarPorContaAsync_ReceitaRemovida_ExcluiSuasParcelas()
    {
        var conta = await SeedContaAsync();
        var receitaAtiva = Receita.Criar("Ativa", conta.Id, 5_000m);
        receitaAtiva.AdicionarParcela(1, Janeiro, 100m);
        var receitaRemovida = Receita.Criar("Removida", conta.Id, 5_000m);
        receitaRemovida.AdicionarParcela(1, Fevereiro, 100m);

        await using (var ctx = db.CreateContext())
        {
            await ctx.Receitas.AddAsync(receitaAtiva);
            await ctx.Receitas.AddAsync(receitaRemovida);
            await ctx.SaveChangesAsync();
        }

        await using (var ctx = db.CreateContext())
        {
            var r = await new ReceitaRepository(ctx).ObterPorIdAsync(receitaRemovida.Id);
            r!.Remover();
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var parcelas = (await new ParcelaRepository(readCtx).ListarPorContaAsync(conta.Id)).ToList();

        parcelas.Should().HaveCount(1);
        parcelas.Single().ReceitaId.Should().Be(receitaAtiva.Id);
    }

    // ── ListarPorReceitaAsync / ListarPorDespesaAsync ────────────────────────

    [Fact]
    public async Task ListarPorReceitaAsync_RetornaApenasParcelasDaReceita()
    {
        var conta = await SeedContaAsync();
        var r1 = Receita.Criar("R1", conta.Id, 10_000m);
        r1.AdicionarParcela(1, Janeiro, 50m);
        r1.AdicionarParcela(2, Fevereiro, 50m);
        var r2 = Receita.Criar("R2", conta.Id, 5_000m);
        r2.AdicionarParcela(1, Marco, 100m);

        await using (var ctx = db.CreateContext())
        {
            await ctx.Receitas.AddAsync(r1);
            await ctx.Receitas.AddAsync(r2);
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var parcelas = await new ParcelaRepository(readCtx).ListarPorReceitaAsync(r1.Id);

        parcelas.Should().HaveCount(2);
        parcelas.Should().AllSatisfy(p => p.ReceitaId.Should().Be(r1.Id));
    }

    [Fact]
    public async Task ListarPorDespesaAsync_RetornaApenasParcelasDaDespesa()
    {
        var conta = await SeedContaAsync();
        var d1 = Despesa.Criar("D1", conta.Id);
        d1.AdicionarParcela(1, Janeiro, 300m);
        d1.AdicionarParcela(2, Fevereiro, 300m);
        var d2 = Despesa.Criar("D2", conta.Id);
        d2.AdicionarParcela(1, Marco, 200m);

        await using (var ctx = db.CreateContext())
        {
            await ctx.Despesas.AddAsync(d1);
            await ctx.Despesas.AddAsync(d2);
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var parcelas = await new ParcelaRepository(readCtx).ListarPorDespesaAsync(d1.Id);

        parcelas.Should().HaveCount(2);
        parcelas.Should().AllSatisfy(p => p.DespesaId.Should().Be(d1.Id));
    }
}
