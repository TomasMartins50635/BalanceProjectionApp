using BalanceProjectionApp.Application.Features.Parcelas.Commands.LiquidarParcela;
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
        var result = await mediator.Send(new LiquidarParcelaCommand(id, body?.DataPagamento), ct);
        return Ok(result);
    }
}

public record LiquidarParcelaRequest(DateOnly? DataPagamento);
