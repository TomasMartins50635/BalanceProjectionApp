using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.RemoverReceita;

public class RemoverReceitaCommandHandler(
    IReceitaRepository receitaRepository,
    IUnitOfWork uow) : IRequestHandler<RemoverReceitaCommand>
{
    public async Task Handle(RemoverReceitaCommand request, CancellationToken cancellationToken)
    {
        var receita = await receitaRepository.ObterPorIdAsync(request.Id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Receita), request.Id);

        receita.Deletar();
        await uow.SaveChangesAsync(cancellationToken);
    }
}
