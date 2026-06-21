using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Interfaces;
using BalanceProjectionApp.Infrastructure.Persistence;
using BalanceProjectionApp.Infrastructure.Persistence.Repositories;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BalanceProjectionApp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = ResolveConnectionString(
            configuration.GetConnectionString("DefaultConnection")
            ?? "Data Source=balance_projection.db");

        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite(connectionString,
                o => o.MigrationsAssembly(typeof(DependencyInjection).Assembly.FullName)));

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IContaRepository, ContaRepository>();
        services.AddScoped<IReceitaRepository, ReceitaRepository>();
        services.AddScoped<IDespesaRepository, DespesaRepository>();
        services.AddScoped<IParcelaRepository, ParcelaRepository>();
        services.AddScoped<IFinanciamentoRepository, FinanciamentoRepository>();
        services.AddScoped<IColaboradorRepository, ColaboradorRepository>();
        services.AddScoped<IPrevisaoRepository, PrevisaoRepository>();

        return services;
    }

    // Relative paths are anchored to a writable location.
    // Absolute paths (Docker, test temp files) pass through unchanged.
    // Production → %LOCALAPPDATA%\BalanceProjectionApp\ (safe even if installed under Program Files)
    // Development → {exe}/data/ (easy to locate for seeding / debugging)
    private static string ResolveConnectionString(string connectionString)
    {
        var builder = new SqliteConnectionStringBuilder(connectionString);
        var src = builder.DataSource;

        if (string.IsNullOrEmpty(src) || src.StartsWith(':') || Path.IsPathRooted(src))
            return connectionString;

        var isDev = string.Equals(
            Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"),
            "Development",
            StringComparison.OrdinalIgnoreCase);

        var dir = isDev
            ? Path.Combine(AppContext.BaseDirectory, "data")
            : Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "BalanceProjectionApp");

        Directory.CreateDirectory(dir);
        builder.DataSource = Path.Combine(dir, src);
        return builder.ToString();
    }
}
