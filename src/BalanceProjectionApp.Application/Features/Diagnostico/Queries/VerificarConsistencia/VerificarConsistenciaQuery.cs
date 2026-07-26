using BalanceProjectionApp.Application.Features.Diagnostico.Dtos;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Diagnostico.Queries.VerificarConsistencia;

public record VerificarConsistenciaQuery : IRequest<ConsistenciaDto>;
