using MediatR;

namespace BalanceProjectionApp.Application.Features.Previsoes.Commands.RemoverPrevisao;

public record RemoverPrevisaoCommand(Guid Id) : IRequest;
