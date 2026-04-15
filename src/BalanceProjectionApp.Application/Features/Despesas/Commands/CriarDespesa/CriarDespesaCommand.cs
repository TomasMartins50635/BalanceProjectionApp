using BalanceProjectionApp.Domain.Enums;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.CriarDespesa;

public record CriarDespesaCommand(
    string Nome,
    Guid ContaId,
    CategoriaContrato? Categoria,
    TipoDespesa TipoDespesa,
    // Pontual / Recorrente
    IEnumerable<CriarDespesaParcelaDto>? Parcelas,
    // Fixa
    decimal? ValorFixo,
    Periodicidade? Periodicidade,
    DateOnly? DataInicio) : IRequest<Guid>;

public record CriarDespesaParcelaDto(int Numero, DateOnly DataVencimento, decimal ValorBruto);
