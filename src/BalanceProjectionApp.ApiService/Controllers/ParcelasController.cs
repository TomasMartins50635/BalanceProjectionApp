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
    public async Task<IActionResult> ListarPorConta(Guid contaId, [FromQuery] bool? apenasPendentes, CancellationToken ct)
        => Ok(await mediator.Send(new ListarParcelasQuery(contaId, apenasPendentes), ct));

    [HttpPost("{id:guid}/liquidar")]
    public async Task<IActionResult> Liquidar(Guid id, [FromBody] LiquidarParcelaRequest? body, CancellationToken ct)
    {
        var result = await mediator.Send(new LiquidarParcelaCommand(id, body?.DataPagamento, body?.ValorReal, body?.ContaId), ct);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/conta")]
    public async Task<IActionResult> AlterarConta(Guid id, [FromBody] AlterarContaRequest body, CancellationToken ct)
    {
        await mediator.Send(new AlterarContaParcelaCommand(id, body.ContaId), ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/estornar")]
    public async Task<IActionResult> Estornar(Guid id, CancellationToken ct)
    {
        await mediator.Send(new EstornarParcelaCommand(id), ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Remover(Guid id, CancellationToken ct)
    {
        await mediator.Send(new RemoverParcelaCommand(id), ct);
        return NoContent();
    }
}

public record LiquidarParcelaRequest(DateOnly? DataPagamento, decimal? ValorReal, Guid? ContaId);
public record AlterarContaRequest(Guid ContaId);
