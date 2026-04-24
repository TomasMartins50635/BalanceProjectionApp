using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.AdicionarParcelaDespesa;

public class AdicionarParcelaDespesaCommandHandler(
    IDespesaRepository despesaRepository,
    IParcelaRepository parcelaRepository,
    IFinanciamentoRepository financiamentoRepository,
    IUnitOfWork uow) : IRequestHandler<AdicionarParcelaDespesaCommand>
{
    public async Task Handle(AdicionarParcelaDespesaCommand request, CancellationToken cancellationToken)
    {
        var despesa = await despesaRepository.ObterPorIdComParcelasAsync(request.DespesaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Despesa), request.DespesaId);

        var financiamento = await financiamentoRepository.ObterPorDespesaIdAsync(despesa.Id, cancellationToken);
        if (financiamento is not null)
        {
            var valorAtual = despesa.Parcelas.Sum(p => p.ValorLiquido);
            if (valorAtual + request.ValorBruto > financiamento.Valor)
                throw new DomainException("A parcela ultrapassa o valor restante do financiamento.");
        }

        var numero = despesa.Parcelas.Count == 0 ? 1 : despesa.Parcelas.Max(p => p.Numero) + 1;
        var parcela = despesa.AdicionarParcela(numero, request.DataVencimento, request.ValorBruto);

        await parcelaRepository.AdicionarAsync(parcela, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
    }
}
