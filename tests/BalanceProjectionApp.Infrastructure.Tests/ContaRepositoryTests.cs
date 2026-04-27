using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Infrastructure.Persistence.Repositories;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Infrastructure.Tests;

[Collection("Database")]
public class ContaRepositoryTests(PostgresFixture db) : IAsyncLifetime
{
    public async Task InitializeAsync() => await db.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    // ── AdicionarAsync / ObterPorIdAsync ─────────────────────────────────────

    [Fact]
    public async Task AdicionarEObterPorId_PersisteConta()
    {
        var conta = Conta.Criar("Conta Principal", 1_500m);

        await using (var ctx = db.CreateContext())
        {
            var repo = new ContaRepository(ctx);
            await repo.AdicionarAsync(conta);
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var resultado = await new ContaRepository(readCtx).ObterPorIdAsync(conta.Id);

        resultado.Should().NotBeNull();
        resultado!.Nome.Should().Be("Conta Principal");
        resultado.Saldo.Should().Be(1_500m);
    }

    [Fact]
    public async Task ObterPorId_IdInexistente_RetornaNull()
    {
        await using var ctx = db.CreateContext();
        var resultado = await new ContaRepository(ctx).ObterPorIdAsync(Guid.NewGuid());

        resultado.Should().BeNull();
    }

    // ── ListarAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task ListarAsync_RetornaTodasAsContas()
    {
        await using (var ctx = db.CreateContext())
        {
            var repo = new ContaRepository(ctx);
            await repo.AdicionarAsync(Conta.Criar("Conta A", 100m));
            await repo.AdicionarAsync(Conta.Criar("Conta B", 200m));
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var lista = await new ContaRepository(readCtx).ListarAsync();

        lista.Should().HaveCountGreaterThanOrEqualTo(2);
        lista.Select(c => c.Nome).Should().Contain(["Conta A", "Conta B"]);
    }

    // ── Remover ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task Remover_ContaExistente_EliminaDaBD()
    {
        var conta = Conta.Criar("Para Remover", 0m);

        await using (var ctx = db.CreateContext())
        {
            var repo = new ContaRepository(ctx);
            await repo.AdicionarAsync(conta);
            await ctx.SaveChangesAsync();
        }

        await using (var ctx = db.CreateContext())
        {
            var repo = new ContaRepository(ctx);
            var carregada = await repo.ObterPorIdAsync(conta.Id);
            repo.Remover(carregada!);
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var resultado = await new ContaRepository(readCtx).ObterPorIdAsync(conta.Id);
        resultado.Should().BeNull();
    }

    // ── TemEntidadesVinculadasAsync ──────────────────────────────────────────

    [Fact]
    public async Task TemEntidadesVinculadas_SemEntidades_RetornaFalse()
    {
        var conta = Conta.Criar("Conta Vazia", 0m);

        await using (var ctx = db.CreateContext())
        {
            await new ContaRepository(ctx).AdicionarAsync(conta);
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var resultado = await new ContaRepository(readCtx).TemEntidadesVinculadasAsync(conta.Id);

        resultado.Should().BeFalse();
    }

    [Fact]
    public async Task TemEntidadesVinculadas_ComReceita_RetornaTrue()
    {
        var conta = Conta.Criar("Conta Com Receita", 0m);
        var receita = Receita.Criar("Proj", conta.Id);

        await using (var ctx = db.CreateContext())
        {
            await ctx.Contas.AddAsync(conta);
            await ctx.Receitas.AddAsync(receita);
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var resultado = await new ContaRepository(readCtx).TemEntidadesVinculadasAsync(conta.Id);

        resultado.Should().BeTrue();
    }
}
