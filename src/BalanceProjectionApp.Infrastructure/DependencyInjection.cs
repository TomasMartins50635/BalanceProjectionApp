using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Interfaces;
using BalanceProjectionApp.Infrastructure.Persistence;
using BalanceProjectionApp.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BalanceProjectionApp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=balance_projection;Username=postgres;Password=postgres";

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString,
                o => o.MigrationsAssembly(typeof(DependencyInjection).Assembly.FullName)));

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IContaRepository, ContaRepository>();
        services.AddScoped<IReceitaRepository, ReceitaRepository>();
        services.AddScoped<IDespesaRepository, DespesaRepository>();
        services.AddScoped<IParcelaRepository, ParcelaRepository>();
        services.AddScoped<IFinanciamentoRepository, FinanciamentoRepository>();
        services.AddScoped<IColaboradorRepository, ColaboradorRepository>();

        return services;
    }
}
