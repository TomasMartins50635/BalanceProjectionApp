using BalanceProjectionApp.Domain.Enums;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.AdicionarComissao;

public record AdicionarComissaoCommand(
    Guid ReceitaId,
    Guid ColaboradorId,
    TipoComissao TipoComissao,
    decimal Percentagem) : IRequest<Guid>;
