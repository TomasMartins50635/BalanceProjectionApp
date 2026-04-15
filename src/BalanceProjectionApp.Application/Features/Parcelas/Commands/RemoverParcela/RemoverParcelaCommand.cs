using MediatR;

namespace BalanceProjectionApp.Application.Features.Parcelas.Commands.RemoverParcela;

public record RemoverParcelaCommand(Guid Id) : IRequest;
