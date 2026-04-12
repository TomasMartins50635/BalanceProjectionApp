using BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;
using BalanceProjectionApp.Domain.Enums;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.CriarDespesa;

public record CriarDespesaCommand(
    string Nome,
    Guid ContaId,
    CategoriaContrato? Categoria,
    IEnumerable<CriarParcelaDto> Parcelas) : IRequest<Guid>;
