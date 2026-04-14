using BalanceProjectionApp.Domain.Enums;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.CriarDespesa;

public record CriarDespesaCommand(
    string Nome,
    Guid ContaId,
    CategoriaContrato? Categoria,
    IEnumerable<CriarDespesaParcelaDto> Parcelas) : IRequest<Guid>;

public record CriarDespesaParcelaDto(int Numero, DateOnly DataVencimento, decimal ValorBruto);
