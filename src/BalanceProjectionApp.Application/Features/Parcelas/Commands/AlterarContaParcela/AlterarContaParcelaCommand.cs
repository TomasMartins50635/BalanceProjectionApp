using MediatR;

namespace BalanceProjectionApp.Application.Features.Parcelas.Commands.AlterarContaParcela;

public record AlterarContaParcelaCommand(Guid ParcelaId, Guid ContaId) : IRequest;
