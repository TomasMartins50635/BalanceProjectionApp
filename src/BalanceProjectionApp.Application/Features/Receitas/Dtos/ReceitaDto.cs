using BalanceProjectionApp.Application.Features.Parcelas.Dtos;
using BalanceProjectionApp.Domain.Enums;

namespace BalanceProjectionApp.Application.Features.Receitas.Dtos;

public record ReceitaDto(
    Guid Id,
    string Nome,
    CategoriaReceita? Categoria,
    Guid ContaId,
    decimal ValorTotal,
    DateTime UpdatedAt,
    IEnumerable<ReceitaComissaoDto> Comissoes,
    IEnumerable<ParcelaDto> Parcelas);

public record ReceitaComissaoDto(
    Guid Id,
    Guid ColaboradorId,
    string ColaboradorNome,
    TipoComissao TipoComissao,
    decimal Percentagem);
