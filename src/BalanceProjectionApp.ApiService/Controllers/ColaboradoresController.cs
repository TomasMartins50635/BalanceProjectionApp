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
    public async Task<IActionResult> Listar(CancellationToken ct)
        => Ok(await mediator.Send(new ListarColaboradoresQuery(), ct));

    [HttpPost]
    public async Task<IActionResult> Criar(CriarColaboradorCommand command, CancellationToken ct)
    {
        var id = await mediator.Send(command, ct);
        return Created($"/colaboradores/{id}", new { id });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id, CancellationToken ct)
    {
        await mediator.Send(new EliminarColaboradorCommand(id), ct);
        return NoContent();
    }
}
