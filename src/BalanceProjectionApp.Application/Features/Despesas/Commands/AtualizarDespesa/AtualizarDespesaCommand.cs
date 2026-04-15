using BalanceProjectionApp.Application.Features.Despesas.Commands.CriarDespesa;
using BalanceProjectionApp.Domain.Enums;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.AtualizarDespesa;

public record AtualizarDespesaCommand(
    Guid Id,
    string Nome,
    CategoriaContrato? Categoria,
    // Pontual / Recorrente
    IEnumerable<CriarDespesaParcelaDto>? Parcelas,
    // Fixa
    decimal? ValorFixo) : IRequest;
