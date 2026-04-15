using MediatR;

namespace BalanceProjectionApp.Application.Features.Parcelas.Commands.EstornarParcela;

public record EstornarParcelaCommand(Guid ParcelaId) : IRequest;
