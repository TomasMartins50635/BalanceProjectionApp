using BalanceProjectionApp.Domain.Enums;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;

public record CriarReceitaCommand(
    string Nome,
    Guid ContaId,
    CategoriaReceita? Categoria,
    Guid? ColaboradorId,
    IEnumerable<CriarParcelaDto> Parcelas,
    bool TemIva = false) : IRequest<Guid>;

public record CriarParcelaDto(int Numero, DateOnly DataVencimento, decimal Valor);
