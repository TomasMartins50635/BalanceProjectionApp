using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Colaboradores.Common;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.AdicionarComissao;

public class AdicionarComissaoCommandHandler(
    IReceitaRepository receitaRepository,
    IColaboradorRepository colaboradorRepository,
    IComissaoDespesaSincronizador comissaoDespesaSincronizador,
    IUnitOfWork uow) : IRequestHandler<AdicionarComissaoCommand, Guid>
{
    public async Task<Guid> Handle(AdicionarComissaoCommand request, CancellationToken cancellationToken)
    {
        var receita = await receitaRepository.ObterPorIdComParcelasAsync(request.ReceitaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Receita), request.ReceitaId);

        var colaborador = await colaboradorRepository.ObterPorIdAsync(request.ColaboradorId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Colaborador), request.ColaboradorId);

        var comissao = receita.AdicionarComissao(colaborador, request.TipoComissao, request.Percentagem);
        await receitaRepository.AdicionarComissaoAsync(comissao, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);

        var meses = receita.Parcelas.Where(p => !p.IsDeleted).Select(p => p.DataVencimento);
        var pares = ComissaoMesHelper.CalcularPares([colaborador.Id], meses);
        foreach (var par in pares)
            await comissaoDespesaSincronizador.RecalcularAsync(par.ColaboradorId, par.Mes, cancellationToken);

        return comissao.Id;
    }
}
