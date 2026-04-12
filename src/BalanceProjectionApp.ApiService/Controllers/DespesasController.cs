using BalanceProjectionApp.Application.Features.Despesas.Commands.CriarDespesa;
using BalanceProjectionApp.Application.Features.Despesas.Queries.ListarDespesas;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BalanceProjectionApp.ApiService.Controllers;

[ApiController]
[Route("despesas")]
public class DespesasController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken ct)
        => Ok(await mediator.Send(new ListarDespesasQuery(), ct));

    [HttpPost]
    public async Task<IActionResult> Criar(CriarDespesaCommand command, CancellationToken ct)
    {
        var id = await mediator.Send(command, ct);
        return Created($"/despesas/{id}", new { id });
    }
}
