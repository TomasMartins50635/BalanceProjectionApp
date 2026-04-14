using MediatR;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Commands.EliminarColaborador;

public record EliminarColaboradorCommand(Guid Id) : IRequest;
