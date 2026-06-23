using BalanceProjectionApp.Application.Features.Colaboradores.Commands.AtualizarColaborador;
using BalanceProjectionApp.Application.Features.Colaboradores.Commands.CriarColaborador;
using BalanceProjectionApp.Application.Features.Colaboradores.Commands.EliminarColaborador;
using BalanceProjectionApp.Application.Features.Colaboradores.Queries.ListarColaboradores;
using BalanceProjectionApp.Application.Features.Colaboradores.Queries.ObterEstatisticasColaborador;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BalanceProjectionApp.ApiService.Controllers;

[ApiController]
[Route("colaboradores")]
public class ColaboradoresController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
        => Ok(await mediator.Send(new ListarColaboradoresQuery(), cancellationToken));

    [HttpPost]
    public async Task<IActionResult> Criar(CriarColaboradorCommand command, CancellationToken cancellationToken)
    {
        var id = await mediator.Send(command, cancellationToken);
        return Created($"/colaboradores/{id}", new { id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Atualizar(Guid id, AtualizarColaboradorCommand command, CancellationToken cancellationToken)
    {
        await mediator.Send(command with { Id = id }, cancellationToken);
        return NoContent();
    }

    [HttpGet("{id:guid}/estatisticas")]
    public async Task<IActionResult> Estatisticas(
        Guid id,
        [FromQuery] DateOnly? inicio,
        [FromQuery] DateOnly? fim,
        CancellationToken cancellationToken)
    {
        var dataInicio = inicio ?? DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-3));
        var dataFim = fim ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await mediator.Send(new ObterEstatisticasColaboradorQuery(id, dataInicio, dataFim), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id, CancellationToken cancellationToken)
    {
        await mediator.Send(new EliminarColaboradorCommand(id), cancellationToken);
        return NoContent();
    }
}
