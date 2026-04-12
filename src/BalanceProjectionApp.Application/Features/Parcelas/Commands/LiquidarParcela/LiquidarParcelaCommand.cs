using MediatR;

namespace BalanceProjectionApp.Application.Features.Parcelas.Commands.LiquidarParcela;

public record LiquidarParcelaCommand(Guid ParcelaId) : IRequest<LiquidarParcelaResult>;

public record LiquidarParcelaResult(Guid ParcelaId, decimal ValorLiquido, decimal NovoSaldoConta);
