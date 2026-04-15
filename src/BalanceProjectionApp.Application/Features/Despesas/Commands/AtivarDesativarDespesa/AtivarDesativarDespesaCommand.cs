using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.AtivarDesativarDespesa;

public record AtivarDesativarDespesaCommand(Guid Id, bool IsActive) : IRequest;
