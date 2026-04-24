namespace BalanceProjectionApp.Application.Features.Financiamentos.Dtos;

public record FinanciamentoDto(
    Guid Id,
    string Nome,
    decimal Valor,
    DateOnly Data,
    Guid ContaId,
    Guid? DespesaId,
    decimal ValorMensalidade,
    int TotalParcelas,
    int ParcelasPagas,
    decimal ValorPago,
    decimal ValorRestante,
    decimal ProgressoPercentagem);
