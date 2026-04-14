using BalanceProjectionApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;
using Xunit;

namespace BalanceProjectionApp.Infrastructure.Tests;

/// <summary>
/// Starts a real PostgreSQL container once for the entire test collection.
/// Each test class should truncate its relevant tables in IAsyncLifetime.InitializeAsync
/// to get a clean state.
/// </summary>
public class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithImage("postgres:17")
        .Build();

    public string ConnectionString { get; private set; } = string.Empty;

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        ConnectionString = _container.GetConnectionString();

        await using var ctx = CreateContext();
        await ctx.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
        => await _container.DisposeAsync();

    /// <summary>Creates a new DbContext per call — never share across tests.</summary>
    public AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(ConnectionString)
            .Options;
        return new AppDbContext(options);
    }

    /// <summary>Truncates all application tables. Call in test class setup for clean state.</summary>
    public async Task ResetDatabaseAsync()
    {
        await using var ctx = CreateContext();
        await ctx.Database.ExecuteSqlRawAsync("""
            TRUNCATE TABLE "Parcelas", "Comissoes", "Financiamentos",
                           "Receitas", "Despesas", "Colaboradores", "Contas"
            CASCADE
            """);
    }
}

[CollectionDefinition("Database")]
public class DatabaseCollection : ICollectionFixture<PostgresFixture> { }
