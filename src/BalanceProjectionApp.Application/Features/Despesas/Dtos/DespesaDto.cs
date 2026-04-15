using BalanceProjectionApp.Application.Features.Parcelas.Dtos;
using BalanceProjectionApp.Domain.Enums;

namespace BalanceProjectionApp.Application.Features.Despesas.Dtos;

public record DespesaDto(
    Guid Id,
    string Nome,
    CategoriaContrato? Categoria,
    Guid ContaId,
    TipoDespesa TipoDespesa,
    decimal? ValorFixo,
    Periodicidade? Periodicidade,
    DateOnly? DataInicio,
    bool IsActive,
    IEnumerable<ParcelaDto> Parcelas);
