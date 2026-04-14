using BalanceProjectionApp.Application.Features.Receitas.Commands.AtualizarReceita;
using BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;
using BalanceProjectionApp.Application.Features.Receitas.Commands.RemoverReceita;
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

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Atualizar(Guid id, AtualizarReceitaCommand command, CancellationToken ct)
    {
        await mediator.Send(command with { Id = id }, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Remover(Guid id, CancellationToken ct)
    {
        await mediator.Send(new RemoverReceitaCommand(id), ct);
        return NoContent();
    }
}
