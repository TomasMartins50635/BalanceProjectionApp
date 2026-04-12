using BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;
using BalanceProjectionApp.Application.Features.Receitas.Queries.ListarReceitas;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BalanceProjectionApp.ApiService.Controllers;

[ApiController]
[Route("receitas")]
public class ReceitasController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken ct)
        => Ok(await mediator.Send(new ListarReceitasQuery(), ct));

    [HttpPost]
    public async Task<IActionResult> Criar(CriarReceitaCommand command, CancellationToken ct)
    {
        var id = await mediator.Send(command, ct);
        return Created($"/receitas/{id}", new { id });
    }
}
