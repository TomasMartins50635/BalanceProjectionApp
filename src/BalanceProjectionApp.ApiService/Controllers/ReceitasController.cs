using BalanceProjectionApp.Application.Features.Receitas.Commands.AdicionarComissao;
using BalanceProjectionApp.Application.Features.Receitas.Commands.AtualizarReceita;
using BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;
using BalanceProjectionApp.Application.Features.Receitas.Commands.RemoverComissao;
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
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new ListarReceitasQuery(), cancellationToken));

    [HttpPost]
    public async Task<IActionResult> Criar(CriarReceitaCommand command, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(command, cancellationToken);
        return Created($"/receitas/{id}", new { id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Atualizar(Guid id, AtualizarReceitaCommand command, CancellationToken cancellationToken)
    {
        await mediator.Send(command with { Id = id }, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Remover(Guid id, CancellationToken cancellationToken)
    {
        await mediator.Send(new RemoverReceitaCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/comissoes")]
    public async Task<IActionResult> AdicionarComissao(Guid id, AdicionarComissaoCommand command, CancellationToken cancellationToken)
    {
        var comissaoId = await mediator.Send(command with { ReceitaId = id }, cancellationToken);
        return Created($"/receitas/{id}/comissoes/{comissaoId}", new { id = comissaoId });
    }

    [HttpDelete("{id:guid}/comissoes/{comissaoId:guid}")]
    public async Task<IActionResult> RemoverComissao(Guid id, Guid comissaoId, CancellationToken cancellationToken)
    {
        await mediator.Send(new RemoverComissaoCommand(id, comissaoId), cancellationToken);
        return NoContent();
    }
}
