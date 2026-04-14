using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;

public record CriarReceitaCommand(
    string Nome,
    Guid ContaId,
    decimal ValorTotal,
    string? Categoria,
    Guid? ColaboradorId,
    IEnumerable<CriarParcelaDto> Parcelas) : IRequest<Guid>;

public record CriarParcelaDto(int Numero, DateOnly DataVencimento, decimal Percentagem);
