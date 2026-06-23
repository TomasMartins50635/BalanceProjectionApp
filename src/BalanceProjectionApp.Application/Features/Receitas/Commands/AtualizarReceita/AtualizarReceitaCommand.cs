using BalanceProjectionApp.Domain.Enums;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.AtualizarReceita;

public record AtualizarReceitaCommand(
    Guid Id,
    string Nome,
    CategoriaReceita? Categoria,
    IEnumerable<AtualizarParcelaDto> Parcelas) : IRequest;

public record AtualizarParcelaDto(int Numero, DateOnly DataVencimento, decimal Valor);
