using BalanceProjectionApp.Application.Features.Previsoes.Commands.AtualizarPrevisao;
using BalanceProjectionApp.Application.Features.Previsoes.Commands.CriarPrevisao;
using BalanceProjectionApp.Application.Features.Previsoes.Commands.RemoverPrevisao;
using BalanceProjectionApp.Application.Features.Previsoes.Queries.ListarPrevisoes;
using BalanceProjectionApp.Application.Features.Previsoes.Queries.ObterDefaultsPrevisao;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BalanceProjectionApp.ApiService.Controllers;

[ApiController]
[Route("previsoes")]
public class PrevisoesController(IMediator mediator) : ControllerBase
{
    /// <summary>Lista previsões. Omitir contaId para previsões globais (agregado).</summary>
    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] Guid? contaId, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new ListarPrevisoesQuery(contaId), cancellationToken));

    /// <summary>Calcula defaults a partir do histórico. Omitir contaId para agregar todas as contas.</summary>
    [HttpGet("defaults")]
    public async Task<IActionResult> ObterDefaults([FromQuery] Guid? contaId, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new ObterDefaultsPrevisaoQuery(contaId), cancellationToken));

    [HttpPost]
    public async Task<IActionResult> Criar(CriarPrevisaoCommand command, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(command, cancellationToken);
        return Created($"/previsoes/{id}", new { id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Atualizar(Guid id, AtualizarPrevisaoCommand command, CancellationToken cancellationToken)
    {
        await mediator.Send(command with { Id = id }, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Remover(Guid id, CancellationToken cancellationToken)
    {
        await mediator.Send(new RemoverPrevisaoCommand(id), cancellationToken);
        return NoContent();
    }
}
