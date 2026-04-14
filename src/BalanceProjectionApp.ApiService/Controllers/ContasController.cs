using BalanceProjectionApp.Application.Features.Contas.Commands.CriarConta;
using BalanceProjectionApp.Application.Features.Contas.Commands.EliminarConta;
using BalanceProjectionApp.Application.Features.Contas.Queries.ListarContas;
using BalanceProjectionApp.Application.Features.Contas.Queries.ObterConta;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BalanceProjectionApp.ApiService.Controllers;

[ApiController]
[Route("contas")]
public class ContasController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken ct)
        => Ok(await mediator.Send(new ListarContasQuery(), ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Obter(Guid id, CancellationToken ct)
    {
        var conta = await mediator.Send(new ObterContaQuery(id), ct);
        return conta is null ? NotFound() : Ok(conta);
    }

    [HttpPost]
    public async Task<IActionResult> Criar(CriarContaCommand command, CancellationToken ct)
    {
        var id = await mediator.Send(command, ct);
        return CreatedAtAction(nameof(Obter), new { id }, new { id });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id, CancellationToken ct)
    {
        await mediator.Send(new EliminarContaCommand(id), ct);
        return NoContent();
    }
}
