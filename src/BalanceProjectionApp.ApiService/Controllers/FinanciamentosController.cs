using BalanceProjectionApp.Application.Features.Financiamentos.Commands.CriarFinanciamento;
using BalanceProjectionApp.Application.Features.Financiamentos.Commands.EliminarFinanciamento;
using BalanceProjectionApp.Application.Features.Financiamentos.Queries.ListarFinanciamentos;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BalanceProjectionApp.ApiService.Controllers;

[ApiController]
[Route("financiamentos")]
public class FinanciamentosController(IMediator mediator) : ControllerBase
{
    [HttpGet("conta/{contaId:guid}")]
    public async Task<IActionResult> ListarPorConta(Guid contaId, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new ListarFinanciamentosQuery(contaId), cancellationToken));

    [HttpPost]
    public async Task<IActionResult> Criar(CriarFinanciamentoCommand command, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(command, cancellationToken);
        return Created($"/financiamentos/{id}", new { id });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id, CancellationToken cancellationToken)
    {
        await mediator.Send(new EliminarFinanciamentoCommand(id), cancellationToken);
        return NoContent();
    }
}
