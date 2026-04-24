using BalanceProjectionApp.Application.Features.Parcelas.Commands.AlterarContaParcela;
using BalanceProjectionApp.Application.Features.Parcelas.Commands.EstornarParcela;
using BalanceProjectionApp.Application.Features.Parcelas.Commands.LiquidarParcela;
using BalanceProjectionApp.Application.Features.Parcelas.Commands.RemoverParcela;
using BalanceProjectionApp.Application.Features.Parcelas.Queries.ListarParcelas;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BalanceProjectionApp.ApiService.Controllers;

[ApiController]
[Route("parcelas")]
public class ParcelasController(IMediator mediator) : ControllerBase
{
    [HttpGet("conta/{contaId:guid}")]
    public async Task<IActionResult> ListarPorConta(Guid contaId, [FromQuery] bool? apenasPendentes, CancellationToken cancellationToken)
        => Ok(await mediator.Send(new ListarParcelasQuery(contaId, apenasPendentes), cancellationToken));

    [HttpPost("{id:guid}/liquidar")]
    public async Task<IActionResult> Liquidar(Guid id, [FromBody] LiquidarParcelaRequest? body, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new LiquidarParcelaCommand(id, body?.DataPagamento, body?.ValorReal, body?.ContaId), cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/conta")]
    public async Task<IActionResult> AlterarConta(Guid id, [FromBody] AlterarContaRequest body, CancellationToken cancellationToken)
    {
        await mediator.Send(new AlterarContaParcelaCommand(id, body.ContaId), cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/estornar")]
    public async Task<IActionResult> Estornar(Guid id, CancellationToken cancellationToken)
    {
        await mediator.Send(new EstornarParcelaCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Remover(Guid id, CancellationToken cancellationToken)
    {
        await mediator.Send(new RemoverParcelaCommand(id), cancellationToken);
        return NoContent();
    }
}

public record LiquidarParcelaRequest(DateOnly? DataPagamento, decimal? ValorReal, Guid? ContaId);
public record AlterarContaRequest(Guid ContaId);
