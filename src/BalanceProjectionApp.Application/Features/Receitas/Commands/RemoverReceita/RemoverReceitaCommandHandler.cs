using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Colaboradores.Common;
using BalanceProjectionApp.Application.Features.Receitas.Common;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.RemoverReceita;

public class RemoverReceitaCommandHandler(
    IReceitaRepository receitaRepository,
    IComissaoDespesaSincronizador comissaoDespesaSincronizador,
    IUnitOfWork uow) : IRequestHandler<RemoverReceitaCommand>
{
    public async Task Handle(RemoverReceitaCommand request, CancellationToken cancellationToken)
    {
        var receita = await receitaRepository.ObterPorIdComParcelasAsync(request.Id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Receita), request.Id);

        if (receita.DespesaIva is not null && !receita.DespesaIva.IsDeleted)
        {
            DespesaIvaFactory.Remover(receita.DespesaIva);
            receita.DesvincularDespesaIva();
        }

        var colaboradorIds = receita.Comissoes.Where(c => !c.IsDeleted).Select(c => c.ColaboradorId).ToList();
        var meses = receita.Parcelas.Where(p => !p.IsDeleted).Select(p => p.DataVencimento).ToList();
        var pares = ComissaoMesHelper.CalcularPares(colaboradorIds, meses);

        receita.Deletar();
        await uow.SaveChangesAsync(cancellationToken);

        foreach (var par in pares)
            await comissaoDespesaSincronizador.RecalcularAsync(par.ColaboradorId, par.Mes, cancellationToken);
    }
}
