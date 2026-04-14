using MediatR;

namespace BalanceProjectionApp.Application.Features.Parcelas.Commands.LiquidarParcela;

public record LiquidarParcelaCommand(Guid ParcelaId, DateOnly? DataPagamento) : IRequest<LiquidarParcelaResult>;

public record LiquidarParcelaResult(Guid ParcelaId, decimal ValorLiquido, decimal NovoSaldoConta);
