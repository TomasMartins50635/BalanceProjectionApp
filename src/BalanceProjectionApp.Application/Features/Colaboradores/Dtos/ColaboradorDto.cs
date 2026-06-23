using BalanceProjectionApp.Domain.Enums;

namespace BalanceProjectionApp.Application.Features.Colaboradores.Dtos;

public record ColaboradorDto(
    Guid Id,
    string Nome,
    TipoColaborador Tipo,
    decimal? PercentagemVenda,
    decimal? PercentagemAngariacao,
    decimal? PercentagemServico);
