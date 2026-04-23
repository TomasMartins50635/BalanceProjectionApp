using MediatR;

namespace BalanceProjectionApp.Application.Features.Parcelas.Commands.LiquidarParcela;

public record LiquidarParcelaCommand(
    Guid ParcelaId,
    DateOnly? DataPagamento,
    decimal? ValorReal = null,
    Guid? ContaId = null) : IRequest<LiquidarParcelaResult>;

public record LiquidarParcelaResult(Guid ParcelaId, decimal ValorLiquido, decimal NovoSaldoConta);
