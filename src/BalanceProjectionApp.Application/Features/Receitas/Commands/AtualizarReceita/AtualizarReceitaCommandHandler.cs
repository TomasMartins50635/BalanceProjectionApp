using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Colaboradores.Common;
using BalanceProjectionApp.Application.Features.Receitas.Common;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.AtualizarReceita;

public class AtualizarReceitaCommandHandler(
    IReceitaRepository receitaRepository,
    IDespesaRepository despesaRepository,
    IParcelaRepository parcelaRepository,
    IComissaoDespesaSincronizador comissaoDespesaSincronizador,
    IUnitOfWork uow) : IRequestHandler<AtualizarReceitaCommand>
{
    public async Task Handle(AtualizarReceitaCommand request, CancellationToken cancellationToken)
    {
        var receita = await receitaRepository.ObterPorIdComParcelasAsync(request.Id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Receita), request.Id);

        var mesesAntigos = receita.Parcelas.Select(p => p.DataVencimento).ToList();
        var colaboradorIds = receita.Comissoes.Where(c => !c.IsDeleted).Select(c => c.ColaboradorId).ToList();

        receita.Atualizar(request.Nome, request.Categoria, request.TemIva);
        receita.RemoverParcelasNaoPagas();

        // A receita já estava rastreada pelo EF (não foi Add()-ada de novo nesta unidade de trabalho),
        // por isso as parcelas novas têm de ser registadas explicitamente — o EF Core não as deteta
        // como novas automaticamente só por terem um Id (GUID gerado no domínio, não pelo EF).
        foreach (var p in request.Parcelas.OrderBy(p => p.Numero))
        {
            var parcela = receita.AdicionarParcela(p.Numero, p.DataVencimento, p.Valor);
            await parcelaRepository.AdicionarAsync(parcela, cancellationToken);
        }

        await SincronizarDespesaIvaAsync(receita, request, cancellationToken);

        await uow.SaveChangesAsync(cancellationToken);

        var mesesNovos = request.Parcelas.Select(p => p.DataVencimento);
        var pares = ComissaoMesHelper.CalcularPares(colaboradorIds, mesesAntigos.Concat(mesesNovos));
        foreach (var par in pares)
            await comissaoDespesaSincronizador.RecalcularAsync(par.ColaboradorId, par.Mes, cancellationToken);
    }

    private async Task SincronizarDespesaIvaAsync(Receita receita, AtualizarReceitaCommand request, CancellationToken cancellationToken)
    {
        var despesaIvaAtiva = receita.DespesaIva is not null && !receita.DespesaIva.IsDeleted;
        var parcelasPreIva = request.Parcelas.Select(p => (p.Numero, p.DataVencimento, p.Valor)).ToList();

        if (request.TemIva && despesaIvaAtiva)
        {
            var novasParcelasIva = DespesaIvaFactory.Sincronizar(receita.DespesaIva!, parcelasPreIva);
            foreach (var parcela in novasParcelasIva)
                await parcelaRepository.AdicionarAsync(parcela, cancellationToken);
        }
        else if (request.TemIva && !despesaIvaAtiva)
        {
            var despesaIva = DespesaIvaFactory.Criar(receita.Nome, receita.ContaId, parcelasPreIva);
            await despesaRepository.AdicionarAsync(despesaIva, cancellationToken);
            receita.VincularDespesaIva(despesaIva.Id);
        }
        else if (!request.TemIva && despesaIvaAtiva)
        {
            DespesaIvaFactory.Remover(receita.DespesaIva!);
            receita.DesvincularDespesaIva();
        }
    }
}
