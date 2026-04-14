using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.RemoverReceita;

public record RemoverReceitaCommand(Guid Id) : IRequest;
