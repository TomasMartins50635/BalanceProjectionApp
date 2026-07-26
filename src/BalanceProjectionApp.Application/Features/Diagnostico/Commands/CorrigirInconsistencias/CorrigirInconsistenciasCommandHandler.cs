using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Colaboradores.Common;
using BalanceProjectionApp.Application.Features.Receitas.Common;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Diagnostico.Commands.CorrigirInconsistencias;

/// <summary>
/// Reaplica a lógica de sincronização já usada em CriarReceita/AtualizarReceita (IVA) e em
/// AdicionarComissao (comissões) às entidades identificadas por VerificarConsistenciaQuery.
/// </summary>
public class CorrigirInconsistenciasCommandHandler(
    IReceitaRepository receitaRepository,
    IDespesaRepository despesaRepository,
    IParcelaRepository parcelaRepository,
    IComissaoDespesaSincronizador comissaoDespesaSincronizador,
    IUnitOfWork uow) : IRequestHandler<CorrigirInconsistenciasCommand>
{
    public async Task Handle(CorrigirInconsistenciasCommand request, CancellationToken cancellationToken)
    {
        foreach (var receitaId in request.ReceitaIds)
        {
            var receita = await receitaRepository.ObterPorIdComParcelasAsync(receitaId, cancellationToken);
            if (receita is null || !receita.TemIva) continue;

            var parcelasPreIva = receita.Parcelas
                .Where(p => !p.IsDeleted)
                .Select(p => (p.Numero, p.DataVencimento, p.ValorLiquido))
                .ToList();

            var despesaAtiva = receita.DespesaIva is not null && !receita.DespesaIva.IsDeleted;
            if (despesaAtiva)
            {
                var novasParcelas = DespesaIvaFactory.Sincronizar(receita.DespesaIva!, parcelasPreIva);
                foreach (var parcela in novasParcelas)
                    await parcelaRepository.AdicionarAsync(parcela, cancellationToken);
            }
            else
            {
                var despesaIva = DespesaIvaFactory.Criar(receita.Nome, receita.ContaId, parcelasPreIva);
                await despesaRepository.AdicionarAsync(despesaIva, cancellationToken);
                receita.VincularDespesaIva(despesaIva.Id);
            }
        }

        await uow.SaveChangesAsync(cancellationToken);

        foreach (var par in request.Comissoes)
            await comissaoDespesaSincronizador.RecalcularAsync(par.ColaboradorId, par.Mes, cancellationToken);
    }
}
