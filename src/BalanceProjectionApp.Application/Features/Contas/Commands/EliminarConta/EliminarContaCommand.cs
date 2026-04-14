using MediatR;

namespace BalanceProjectionApp.Application.Features.Contas.Commands.EliminarConta;

public record EliminarContaCommand(Guid ContaId) : IRequest;
