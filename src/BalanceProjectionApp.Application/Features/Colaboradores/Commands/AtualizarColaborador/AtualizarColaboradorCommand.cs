using MediatR;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Commands.AtualizarColaborador;

public record AtualizarColaboradorCommand(
    Guid Id,
    string Nome,
    decimal? PercentagemVenda,
    decimal? PercentagemAngariacao,
    decimal? PercentagemServico) : IRequest;
