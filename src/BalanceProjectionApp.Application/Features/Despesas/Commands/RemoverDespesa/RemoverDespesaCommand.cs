using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.RemoverDespesa;

public record RemoverDespesaCommand(Guid Id) : IRequest;
