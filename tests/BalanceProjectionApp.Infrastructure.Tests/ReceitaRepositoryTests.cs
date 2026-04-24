using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Infrastructure.Persistence.Repositories;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Infrastructure.Tests;

[Collection("Database")]
public class ReceitaRepositoryTests(PostgresFixture db) : IAsyncLifetime
{
    public async Task InitializeAsync() => await db.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private static readonly DateOnly Vencimento = new(2026, 6, 1);

    private async Task<Conta> SeedContaAsync()
    {
        var conta = Conta.Criar("Conta", 0m);
        await using var ctx = db.CreateContext();
        await ctx.Contas.AddAsync(conta);
        await ctx.SaveChangesAsync();
        return conta;
    }

    // ── AdicionarAsync / ObterPorIdComParcelasAsync ──────────────────────────

    [Fact]
    public async Task AdicionarEObterComParcelas_CascadePersisteParcelas()
    {
        var conta = await SeedContaAsync();
        var receita = Receita.Criar("Proj", conta.Id, 10_000m);
        receita.AdicionarParcela(1, Vencimento, 50m);
        receita.AdicionarParcela(2, Vencimento.AddMonths(1), 50m);

        await using (var ctx = db.CreateContext())
        {
            await new ReceitaRepository(ctx).AdicionarAsync(receita);
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var resultado = await new ReceitaRepository(readCtx).ObterPorIdComParcelasAsync(receita.Id);

        resultado.Should().NotBeNull();
        resultado!.Nome.Should().Be("Proj");
        resultado.Parcelas.Should().HaveCount(2);
        resultado.Parcelas.Select(p => p.Numero).Should().BeEquivalentTo([1, 2]);
    }

    [Fact]
    public async Task ObterPorId_IdInexistente_RetornaNull()
    {
        await using var ctx = db.CreateContext();
        var resultado = await new ReceitaRepository(ctx).ObterPorIdAsync(Guid.NewGuid());
        resultado.Should().BeNull();
    }

    // ── ListarAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task ListarAsync_IncluiParcelasEPercentagemComissao()
    {
        var conta = await SeedContaAsync();
        var colaborador = Colaborador.Criar("Ana", 10m);
        var receita = Receita.Criar("Proj com Comissao", conta.Id, 10_000m);
        receita.AssociarColaborador(colaborador);
        receita.AdicionarParcela(1, Vencimento, 100m);

        await using (var ctx = db.CreateContext())
        {
            await ctx.Colaboradores.AddAsync(colaborador);
            await new ReceitaRepository(ctx).AdicionarAsync(receita);
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var lista = await new ReceitaRepository(readCtx).ListarAsync();

        var encontrada = lista.First(r => r.Id == receita.Id);
        encontrada.Colaborador!.Percentagem.Should().Be(10m);
        encontrada.Parcelas.Should().HaveCount(1);
        encontrada.Parcelas.Single().ValorLiquido.Should().Be(9_000m); // 10000 - 10%
    }

    // ── Global query filter (soft delete) ────────────────────────────────────

    [Fact]
    public async Task ListarAsync_ReceitaRemovidaNaoRetornada()
    {
        var conta = await SeedContaAsync();
        var ativa = Receita.Criar("Ativa", conta.Id, 5_000m);
        var removida = Receita.Criar("Removida", conta.Id, 5_000m);

        await using (var ctx = db.CreateContext())
        {
            await ctx.Receitas.AddAsync(ativa);
            await ctx.Receitas.AddAsync(removida);
            await ctx.SaveChangesAsync();
        }

        // Soft-delete numa segunda transação (simula o use case RemoverReceita)
        await using (var ctx = db.CreateContext())
        {
            var r = await new ReceitaRepository(ctx).ObterPorIdAsync(removida.Id);
            r!.Deletar();
            await ctx.SaveChangesAsync();
        }

        await using var readCtx = db.CreateContext();
        var lista = await new ReceitaRepository(readCtx).ListarAsync();

        lista.Should().Contain(r => r.Id == ativa.Id);
        lista.Should().NotContain(r => r.Id == removida.Id);
    }
}
