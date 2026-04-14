using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.AtualizarReceita;

public record AtualizarReceitaCommand(
    Guid Id,
    string Nome,
    decimal ValorTotal,
    string? Categoria,
    Guid? ColaboradorId,
    IEnumerable<AtualizarParcelaDto> Parcelas) : IRequest;

public record AtualizarParcelaDto(int Numero, DateOnly DataVencimento, decimal Percentagem);
