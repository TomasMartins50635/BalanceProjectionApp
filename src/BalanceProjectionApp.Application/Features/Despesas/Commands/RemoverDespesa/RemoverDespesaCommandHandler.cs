using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.RemoverDespesa;

public class RemoverDespesaCommandHandler(
    IDespesaRepository despesaRepository,
    IUnitOfWork uow) : IRequestHandler<RemoverDespesaCommand>
{
    public async Task Handle(RemoverDespesaCommand request, CancellationToken cancellationToken)
    {
        var despesa = await despesaRepository.ObterPorIdComParcelasAsync(request.Id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Despesa), request.Id);

        foreach (var parcela in despesa.Parcelas.Where(p => !p.IsDeleted))
            parcela.Deletar();

        despesa.Deletar();
        await uow.SaveChangesAsync(cancellationToken);
    }
}
