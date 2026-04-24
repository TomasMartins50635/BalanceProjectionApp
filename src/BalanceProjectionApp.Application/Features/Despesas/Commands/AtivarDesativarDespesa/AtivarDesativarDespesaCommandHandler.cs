using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.AtivarDesativarDespesa;

public class AtivarDesativarDespesaCommandHandler(
    IDespesaRepository despesaRepository,
    IUnitOfWork uow) : IRequestHandler<AtivarDesativarDespesaCommand>
{
    public async Task Handle(AtivarDesativarDespesaCommand request, CancellationToken cancellationToken)
    {
        var despesa = await despesaRepository.ObterPorIdComParcelasAsync(request.Id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Despesa), request.Id);

        if (request.IsActive)
        {
            despesa.Ativar();

            // Ao ativar, gerar próxima parcela se não existir nenhuma pendente
            if (despesa.TipoDespesa != TipoDespesa.Pontual && !despesa.Parcelas.Any(p => !p.IsPaid))
                despesa.GerarProximaParcela();
        }
        else
        {
            despesa.Desativar();
        }

        await uow.SaveChangesAsync(cancellationToken);
    }
}
