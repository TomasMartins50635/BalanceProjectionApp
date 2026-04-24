using BalanceProjectionApp.Application.Features.Colaboradores.Commands.CriarColaborador;
using BalanceProjectionApp.Application.Features.Colaboradores.Commands.EliminarColaborador;
using BalanceProjectionApp.Application.Features.Colaboradores.Queries.ListarColaboradores;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BalanceProjectionApp.ApiService.Controllers;

[ApiController]
[Route("colaboradores")]
public class ColaboradoresController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new ListarColaboradoresQuery(), cancellationToken));

    [HttpPost]
    public async Task<IActionResult> Criar(CriarColaboradorCommand command, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(command, cancellationToken);
        return Created($"/colaboradores/{id}", new { id });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id, CancellationToken cancellationToken)
    {
        await mediator.Send(new EliminarColaboradorCommand(id), cancellationToken);
        return NoContent();
    }
}
