namespace BalanceProjectionApp.Application.Features.Parcelas.Dtos;

public record ParcelaDto(
    Guid Id,
    int Numero,
    DateOnly DataVencimento,
    decimal ValorBruto,
    decimal ValorLiquido,
    bool IsPaid,
    DateOnly? DataPagamento,
    Guid? ReceitaId,
    Guid? DespesaId,
    decimal? Percentagem,
    string? Nome);
