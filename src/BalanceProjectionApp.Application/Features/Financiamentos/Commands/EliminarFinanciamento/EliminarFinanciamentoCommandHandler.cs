using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Commands.EliminarFinanciamento;

public class EliminarFinanciamentoCommandHandler(
    IFinanciamentoRepository financiamentoRepository,
    IUnitOfWork uow) : IRequestHandler<EliminarFinanciamentoCommand>
{
    public async Task Handle(EliminarFinanciamentoCommand request, CancellationToken cancellationToken)
    {
        var financiamento = await financiamentoRepository.ObterPorIdAsync(request.Id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Financiamento), request.Id);

        if (financiamento.Despesa is not null)
        {
            foreach (var parcela in financiamento.Despesa.Parcelas.Where(p => !p.IsDeleted))
                parcela.Deletar();

            financiamento.Despesa.Deletar();
        }

        financiamento.Deletar();
        await uow.SaveChangesAsync(cancellationToken);
    }
}
