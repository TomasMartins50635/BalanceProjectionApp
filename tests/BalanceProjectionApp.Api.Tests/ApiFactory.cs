using BalanceProjectionApp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;
using Xunit;

namespace BalanceProjectionApp.Api.Tests;

/// <summary>
/// Boots the real ASP.NET Core application against a Postgres container.
/// Use as an ICollectionFixture so one container is shared for the whole test run.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:17")
        .Build();

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
    }

    public new async Task DisposeAsync()
    {
        await _postgres.DisposeAsync();
        await base.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Use the container's connection string instead of the real one
        builder.UseEnvironment("Development"); // ensures EnsureCreatedAsync runs in Program.cs
        builder.UseSetting("ConnectionStrings:DefaultConnection", _postgres.GetConnectionString());
    }

    /// <summary>Truncates all tables so each test class starts with an empty database.</summary>
    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await ctx.Database.ExecuteSqlRawAsync("""
            TRUNCATE TABLE "Parcelas", "Financiamentos",
                           "Receitas", "Despesas", "Colaboradores", "Contas"
            CASCADE
            """);
    }
}

[CollectionDefinition("Api")]
public class ApiCollection : ICollectionFixture<ApiFactory> { }
