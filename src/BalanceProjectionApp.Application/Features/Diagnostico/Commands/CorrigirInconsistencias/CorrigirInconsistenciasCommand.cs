using MediatR;

namespace BalanceProjectionApp.Application.Features.Diagnostico.Commands.CorrigirInconsistencias;

public record ColaboradorMes(Guid ColaboradorId, DateOnly Mes);

public record CorrigirInconsistenciasCommand(
    IReadOnlyList<Guid> ReceitaIds,
    IReadOnlyList<ColaboradorMes> Comissoes
) : IRequest;
