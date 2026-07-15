using System.Reflection;
using BalanceProjectionApp.Application.Common.Behaviours;
using BalanceProjectionApp.Application.Features.Colaboradores.Common;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace BalanceProjectionApp.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));
        services.AddValidatorsFromAssembly(assembly);
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehaviour<,>));
        services.AddScoped<IComissaoDespesaSincronizador, ComissaoDespesaSincronizador>();

        return services;
    }
}
