using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Previsoes.Commands.AtualizarPrevisao;

public class AtualizarPrevisaoCommandHandler(
    IPrevisaoRepository previsaoRepository,
    IUnitOfWork uow) : IRequestHandler<AtualizarPrevisaoCommand>
{
    public async Task Handle(AtualizarPrevisaoCommand request, CancellationToken cancellationToken)
    {
        var previsao = await previsaoRepository.ObterPorIdAsync(request.Id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Previsao), request.Id);

        previsao.Atualizar(
            request.Nome,
            request.DiasEntreVendas,
            request.ValorMedioVenda,
            request.DiasEntreArrendamentos,
            request.ValorMedioArrendamento);

        await uow.SaveChangesAsync(cancellationToken);
    }
}
