using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Colaboradores.Common;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.RemoverComissao;

public class RemoverComissaoCommandHandler(
    IReceitaRepository receitaRepository,
    IComissaoDespesaSincronizador comissaoDespesaSincronizador,
    IUnitOfWork uow) : IRequestHandler<RemoverComissaoCommand>
{
    public async Task Handle(RemoverComissaoCommand request, CancellationToken cancellationToken)
    {
        var comissao = await receitaRepository.ObterComissaoPorIdAsync(request.ReceitaId, request.ComissaoId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(ReceitaComissao), request.ComissaoId);

        comissao.Deletar();
        await uow.SaveChangesAsync(cancellationToken);

        var receita = await receitaRepository.ObterPorIdComParcelasAsync(request.ReceitaId, cancellationToken);
        var meses = receita?.Parcelas.Where(p => !p.IsDeleted).Select(p => p.DataVencimento) ?? [];
        var pares = ComissaoMesHelper.CalcularPares([comissao.ColaboradorId], meses);
        foreach (var par in pares)
            await comissaoDespesaSincronizador.RecalcularAsync(par.ColaboradorId, par.Mes, cancellationToken);
    }
}
