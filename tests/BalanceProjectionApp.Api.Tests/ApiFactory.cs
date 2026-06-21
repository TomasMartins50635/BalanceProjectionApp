using BalanceProjectionApp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BalanceProjectionApp.Api.Tests;

public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"api_test_{Guid.NewGuid():N}.db");

    public Task InitializeAsync() => Task.CompletedTask;

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        try { if (File.Exists(_dbPath)) File.Delete(_dbPath); }
        catch (IOException) { /* temp file; OS will clean up */ }
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("ConnectionStrings:DefaultConnection", $"Data Source={_dbPath}");
    }

    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await ctx.Database.ExecuteSqlRawAsync("DELETE FROM \"Parcelas\"");
        await ctx.Database.ExecuteSqlRawAsync("DELETE FROM \"Financiamentos\"");
        await ctx.Database.ExecuteSqlRawAsync("DELETE FROM \"Previsoes\"");
        await ctx.Database.ExecuteSqlRawAsync("DELETE FROM \"Receitas\"");
        await ctx.Database.ExecuteSqlRawAsync("DELETE FROM \"Despesas\"");
        await ctx.Database.ExecuteSqlRawAsync("DELETE FROM \"Colaboradores\"");
        await ctx.Database.ExecuteSqlRawAsync("DELETE FROM \"Contas\"");
    }
}

[CollectionDefinition("Api")]
public class ApiCollection : ICollectionFixture<ApiFactory> { }
