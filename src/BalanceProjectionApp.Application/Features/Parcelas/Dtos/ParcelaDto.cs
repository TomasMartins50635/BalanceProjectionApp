namespace BalanceProjectionApp.Application.Features.Parcelas.Dtos;

public record ParcelaDto(
    Guid Id,
    int Numero,
    DateOnly DataVencimento,
    decimal ValorBruto,
    decimal ValorLiquido,
    bool IsPaid,
    DateTime? DataPagamento,
    Guid? ReceitaId,
    Guid? DespesaId);
