using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.AtualizarDespesa;

public class AtualizarDespesaCommandHandler(
    IDespesaRepository despesaRepository,
    IUnitOfWork uow) : IRequestHandler<AtualizarDespesaCommand>
{
    public async Task Handle(AtualizarDespesaCommand request, CancellationToken ct)
    {
        var despesa = await despesaRepository.ObterPorIdComParcelasAsync(request.Id, ct)
            ?? throw new EntityNotFoundException(nameof(Despesa), request.Id);

        despesa.Atualizar(request.Nome, request.Categoria);

        if (despesa.TipoDespesa == TipoDespesa.Fixa)
        {
            if (request.ValorFixo.HasValue)
                despesa.AtualizarValorFixo(request.ValorFixo.Value);
        }
        else
        {
            despesa.RemoverParcelasNaoLiquidadas();

            foreach (var p in (request.Parcelas ?? []).OrderBy(p => p.Numero))
                despesa.AdicionarParcela(p.Numero, p.DataVencimento, p.ValorBruto);
        }

        await uow.SaveChangesAsync(ct);
    }
}
