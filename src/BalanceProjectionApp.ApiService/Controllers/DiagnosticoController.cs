using BalanceProjectionApp.Application.Features.Diagnostico.Commands.CorrigirInconsistencias;
using BalanceProjectionApp.Application.Features.Diagnostico.Queries.VerificarConsistencia;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BalanceProjectionApp.ApiService.Controllers;

[ApiController]
[Route("diagnostico")]
public class DiagnosticoController(IMediator mediator) : ControllerBase
{
    [HttpGet("consistencia")]
    public async Task<IActionResult> VerificarConsistencia(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new VerificarConsistenciaQuery(), cancellationToken));

    [HttpPost("corrigir")]
    public async Task<IActionResult> Corrigir(CorrigirInconsistenciasCommand command, CancellationToken cancellationToken)
    {
        await mediator.Send(command, cancellationToken);
        return NoContent();
    }
}
