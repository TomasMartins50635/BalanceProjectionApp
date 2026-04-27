using BalanceProjectionApp.Application.Features.Parcelas.Dtos;
using BalanceProjectionApp.Domain.Enums;

namespace BalanceProjectionApp.Application.Features.Receitas.Dtos;

public record ReceitaDto(
    Guid Id,
    string Nome,
    CategoriaReceita? Categoria,
    Guid ContaId,
    decimal ValorTotal,
    Guid? ColaboradorId,
    string? ColaboradorNome,
    decimal? PercentagemComissao,
    DateTime UpdatedAt,
    IEnumerable<ParcelaDto> Parcelas);
