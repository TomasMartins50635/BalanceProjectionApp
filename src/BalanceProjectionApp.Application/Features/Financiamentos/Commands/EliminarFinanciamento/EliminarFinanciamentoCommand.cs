using MediatR;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Commands.EliminarFinanciamento;

public record EliminarFinanciamentoCommand(Guid Id) : IRequest;
