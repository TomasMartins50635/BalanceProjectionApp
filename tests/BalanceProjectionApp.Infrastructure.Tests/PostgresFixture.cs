using BalanceProjectionApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace BalanceProjectionApp.Infrastructure.Tests;

public class PostgresFixture : IAsyncLifetime
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"infra_test_{Guid.NewGuid():N}.db");

    public string ConnectionString { get; private set; } = string.Empty;

    public async Task InitializeAsync()
    {
        ConnectionString = $"Data Source={_dbPath};Pooling=False";
        await using var ctx = CreateContext();
        await ctx.Database.EnsureCreatedAsync();
    }

    public Task DisposeAsync()
    {
        try { if (File.Exists(_dbPath)) File.Delete(_dbPath); }
        catch (IOException) { /* temp file; OS will clean up */ }
        return Task.CompletedTask;
    }

    public AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(ConnectionString)
            .Options;
        return new AppDbContext(options);
    }

    public async Task ResetDatabaseAsync()
    {
        await using var ctx = CreateContext();
        await ctx.Database.ExecuteSqlRawAsync("DELETE FROM \"Parcelas\"");
        await ctx.Database.ExecuteSqlRawAsync("DELETE FROM \"Financiamentos\"");
        await ctx.Database.ExecuteSqlRawAsync("DELETE FROM \"Previsoes\"");
        await ctx.Database.ExecuteSqlRawAsync("DELETE FROM \"Receitas\"");
        await ctx.Database.ExecuteSqlRawAsync("DELETE FROM \"Despesas\"");
        await ctx.Database.ExecuteSqlRawAsync("DELETE FROM \"Colaboradores\"");
        await ctx.Database.ExecuteSqlRawAsync("DELETE FROM \"Contas\"");
    }
}

[CollectionDefinition("Database")]
public class DatabaseCollection : ICollectionFixture<PostgresFixture> { }
