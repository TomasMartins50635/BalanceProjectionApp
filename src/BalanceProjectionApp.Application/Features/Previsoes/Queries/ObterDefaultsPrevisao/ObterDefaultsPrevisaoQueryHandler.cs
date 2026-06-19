using BalanceProjectionApp.Application.Features.Previsoes.Dtos;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Previsoes.Queries.ObterDefaultsPrevisao;

public class ObterDefaultsPrevisaoQueryHandler(IReceitaRepository receitaRepository)
    : IRequestHandler<ObterDefaultsPrevisaoQuery, DefaultsPrevisaoDto>
{
    public async Task<DefaultsPrevisaoDto> Handle(ObterDefaultsPrevisaoQuery request, CancellationToken cancellationToken)
    {
        var vendas = (await receitaRepository.ListarPorContaECategoriaAsync(
            request.ContaId, CategoriaReceita.Vendas, cancellationToken)).ToList();

        var arrendamentos = (await receitaRepository.ListarPorContaECategoriaAsync(
            request.ContaId, CategoriaReceita.Arrendamentos, cancellationToken)).ToList();

        return new DefaultsPrevisaoDto(
            CalcularDiasEntre(vendas),
            CalcularValorMedio(vendas),
            CalcularDiasEntre(arrendamentos),
            CalcularValorMedio(arrendamentos));
    }

    private static int? CalcularDiasEntre(List<Receita> receitas)
    {
        var datas = receitas
            .Select(r => r.Parcelas.Where(p => !p.IsDeleted).MinBy(p => p.DataVencimento)?.DataVencimento)
            .Where(d => d.HasValue)
            .Select(d => d!.Value)
            .OrderBy(d => d)
            .ToList();

        if (datas.Count < 2) return null;

        var totalDias = datas
            .Zip(datas.Skip(1), (a, b) => (b.ToDateTime(TimeOnly.MinValue) - a.ToDateTime(TimeOnly.MinValue)).Days)
            .Sum();

        return (int)Math.Round((double)totalDias / (datas.Count - 1));
    }

    private static decimal? CalcularValorMedio(List<Receita> receitas)
    {
        if (receitas.Count == 0) return null;

        var valores = receitas
            .Select(r => r.Parcelas.Where(p => !p.IsDeleted).Sum(p => p.ValorBruto))
            .ToList();

        return Math.Round(valores.Average(), 2);
    }
}
