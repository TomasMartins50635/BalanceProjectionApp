using BalanceProjectionApp.Application.Features.Colaboradores.Dtos;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Queries.ObterEstatisticasColaborador;

public record ObterEstatisticasColaboradorQuery(
    Guid ColaboradorId,
    DateOnly DataInicio,
    DateOnly DataFim
) : IRequest<ColaboradorEstatisticasDto?>;
