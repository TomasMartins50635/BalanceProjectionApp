using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Previsoes.Commands.RemoverPrevisao;

public class RemoverPrevisaoCommandHandler(
    IPrevisaoRepository previsaoRepository,
    IUnitOfWork uow) : IRequestHandler<RemoverPrevisaoCommand>
{
    public async Task Handle(RemoverPrevisaoCommand request, CancellationToken cancellationToken)
    {
        var previsao = await previsaoRepository.ObterPorIdAsync(request.Id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Previsao), request.Id);

        previsao.Deletar();
        await uow.SaveChangesAsync(cancellationToken);
    }
}
