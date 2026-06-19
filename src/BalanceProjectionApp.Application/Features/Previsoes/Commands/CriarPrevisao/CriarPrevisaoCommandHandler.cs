using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Previsoes.Commands.CriarPrevisao;

public class CriarPrevisaoCommandHandler(
    IPrevisaoRepository previsaoRepository,
    IContaRepository contaRepository,
    IUnitOfWork uow) : IRequestHandler<CriarPrevisaoCommand, Guid>
{
    public async Task<Guid> Handle(CriarPrevisaoCommand request, CancellationToken cancellationToken)
    {
        if (request.ContaId.HasValue)
            _ = await contaRepository.ObterPorIdAsync(request.ContaId.Value, cancellationToken)
                ?? throw new EntityNotFoundException(nameof(Conta), request.ContaId.Value);

        var previsao = Previsao.Criar(
            request.Nome,
            request.ContaId,
            request.DiasEntreVendas,
            request.ValorMedioVenda,
            request.DiasEntreArrendamentos,
            request.ValorMedioArrendamento);

        await previsaoRepository.AdicionarAsync(previsao, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return previsao.Id;
    }
}
