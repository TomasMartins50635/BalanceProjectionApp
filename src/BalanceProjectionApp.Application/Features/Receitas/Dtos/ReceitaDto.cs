using BalanceProjectionApp.Application.Features.Parcelas.Dtos;

namespace BalanceProjectionApp.Application.Features.Receitas.Dtos;

public record ReceitaDto(
    Guid Id,
    string Nome,
    string? Categoria,
    Guid ContaId,
    decimal ValorTotal,
    Guid? ColaboradorId,
    string? ColaboradorNome,
    decimal? PercentagemComissao,
    IEnumerable<ParcelaDto> Parcelas);
