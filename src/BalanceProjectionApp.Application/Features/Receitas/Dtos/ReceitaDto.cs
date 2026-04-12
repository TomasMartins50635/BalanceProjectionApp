using BalanceProjectionApp.Application.Features.Parcelas.Dtos;
using BalanceProjectionApp.Domain.Enums;

namespace BalanceProjectionApp.Application.Features.Receitas.Dtos;

public record ReceitaDto(
    Guid Id,
    string Nome,
    CategoriaContrato? Categoria,
    Guid ContaId,
    decimal? PercentagemComissao,
    IEnumerable<ParcelaDto> Parcelas);
