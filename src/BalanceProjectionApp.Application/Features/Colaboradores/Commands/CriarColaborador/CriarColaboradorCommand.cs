using BalanceProjectionApp.Domain.Enums;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Commands.CriarColaborador;

public record CriarColaboradorCommand(
    string Nome,
    TipoColaborador Tipo,
    decimal? PercentagemVenda,
    decimal? PercentagemAngariacao,
    decimal? PercentagemServico) : IRequest<Guid>;
