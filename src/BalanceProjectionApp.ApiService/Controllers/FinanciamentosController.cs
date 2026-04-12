using BalanceProjectionApp.Application.Features.Financiamentos.Commands.CriarFinanciamento;
using BalanceProjectionApp.Application.Features.Financiamentos.Queries.ListarFinanciamentos;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BalanceProjectionApp.ApiService.Controllers;

[ApiController]
[Route("financiamentos")]
public class FinanciamentosController(IMediator mediator) : ControllerBase
{
    [HttpGet("conta/{contaId:guid}")]
    public async Task<IActionResult> ListarPorConta(Guid contaId, CancellationToken ct)
        => Ok(await mediator.Send(new ListarFinanciamentosQuery(contaId), ct));

    [HttpPost]
    public async Task<IActionResult> Criar(CriarFinanciamentoCommand command, CancellationToken ct)
    {
        var id = await mediator.Send(command, ct);
        return Created($"/financiamentos/{id}", new { id });
    }
}
