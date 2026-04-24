using BalanceProjectionApp.Application.Features.Despesas.Commands.AdicionarParcelaDespesa;
using BalanceProjectionApp.Application.Features.Despesas.Commands.AtivarDesativarDespesa;
using BalanceProjectionApp.Application.Features.Despesas.Commands.AtualizarDespesa;
using BalanceProjectionApp.Application.Features.Despesas.Commands.CriarDespesa;
using BalanceProjectionApp.Application.Features.Despesas.Commands.RemoverDespesa;
using BalanceProjectionApp.Application.Features.Despesas.Queries.ListarDespesas;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BalanceProjectionApp.ApiService.Controllers;

public record AtivarDesativarRequest(bool IsActive);

[ApiController]
[Route("despesas")]
public class DespesasController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new ListarDespesasQuery(), cancellationToken));

    [HttpPost]
    public async Task<IActionResult> Criar(CriarDespesaCommand command, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(command, cancellationToken);
        return Created($"/despesas/{id}", new { id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Atualizar(Guid id, AtualizarDespesaCommand command, CancellationToken cancellationToken)
    {
        await mediator.Send(command with { Id = id }, cancellationToken);
        return NoContent();
    }

    [HttpPatch("{id:guid}/estado")]
    public async Task<IActionResult> AtivarDesativar(Guid id, [FromBody] AtivarDesativarRequest body, CancellationToken cancellationToken)
    {
        await mediator.Send(new AtivarDesativarDespesaCommand(id, body.IsActive), cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/parcelas")]
    public async Task<IActionResult> AdicionarParcela(Guid id, [FromBody] AdicionarParcelaDespesaCommand command, CancellationToken cancellationToken)
    {
        await mediator.Send(command with { DespesaId = id }, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Remover(Guid id, CancellationToken cancellationToken)
    {
        await mediator.Send(new RemoverDespesaCommand(id), cancellationToken);
        return NoContent();
    }
}
