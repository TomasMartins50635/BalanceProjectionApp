using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.RemoverComissao;

public record RemoverComissaoCommand(Guid ReceitaId, Guid ComissaoId) : IRequest;
