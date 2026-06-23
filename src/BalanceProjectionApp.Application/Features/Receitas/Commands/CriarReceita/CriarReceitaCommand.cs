using BalanceProjectionApp.Domain.Enums;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;

public record CriarReceitaCommand(
    string Nome,
    Guid ContaId,
    CategoriaReceita? Categoria,
    IEnumerable<CriarParcelaDto> Parcelas,
    IEnumerable<ComissaoInputDto>? Comissoes = null,
    bool TemIva = false) : IRequest<Guid>;

public record CriarParcelaDto(int Numero, DateOnly DataVencimento, decimal Valor);

public record ComissaoInputDto(Guid ColaboradorId, TipoComissao TipoComissao, decimal Percentagem);
