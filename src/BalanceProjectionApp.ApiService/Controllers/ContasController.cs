using BalanceProjectionApp.Application.Features.Contas.Commands.AjustarSaldoConta;
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
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new ListarContasQuery(), cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Obter(Guid id, CancellationToken cancellationToken)
    {
        var conta = await mediator.Send(new ObterContaQuery(id), cancellationToken);
        return conta is null ? NotFound() : Ok(conta);
    }

    [HttpPost]
    public async Task<IActionResult> Criar(CriarContaCommand command, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(Obter), new { id }, new { id });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id, CancellationToken cancellationToken)
    {
        await mediator.Send(new EliminarContaCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpPatch("{id:guid}/saldo")]
    public async Task<IActionResult> AjustarSaldo(Guid id, AjustarSaldoContaRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new AjustarSaldoContaCommand(id, request.NovoSaldo), cancellationToken);
        return NoContent();
    }
}

public record AjustarSaldoContaRequest(decimal NovoSaldo);
