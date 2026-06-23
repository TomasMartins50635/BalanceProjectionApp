using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.RemoverComissao;

public class RemoverComissaoCommandHandler(
    IReceitaRepository receitaRepository,
    IUnitOfWork uow) : IRequestHandler<RemoverComissaoCommand>
{
    public async Task Handle(RemoverComissaoCommand request, CancellationToken cancellationToken)
    {
        var comissao = await receitaRepository.ObterComissaoPorIdAsync(request.ReceitaId, request.ComissaoId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(ReceitaComissao), request.ComissaoId);

        comissao.Deletar();
        await uow.SaveChangesAsync(cancellationToken);
    }
}
