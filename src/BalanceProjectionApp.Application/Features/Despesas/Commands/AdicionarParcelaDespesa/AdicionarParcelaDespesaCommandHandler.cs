using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.AdicionarParcelaDespesa;

public class AdicionarParcelaDespesaCommandHandler(
    IDespesaRepository despesaRepository,
    IParcelaRepository parcelaRepository,
    IUnitOfWork uow) : IRequestHandler<AdicionarParcelaDespesaCommand>
{
    public async Task Handle(AdicionarParcelaDespesaCommand request, CancellationToken ct)
    {
        var despesa = await despesaRepository.ObterPorIdComParcelasAsync(request.DespesaId, ct)
            ?? throw new EntityNotFoundException(nameof(Despesa), request.DespesaId);

        var numero = despesa.Parcelas.Count == 0 ? 1 : despesa.Parcelas.Max(p => p.Numero) + 1;
        var parcela = despesa.AdicionarParcela(numero, request.DataVencimento, request.ValorBruto);

        await parcelaRepository.AdicionarAsync(parcela, ct);
        await uow.SaveChangesAsync(ct);
    }
}
