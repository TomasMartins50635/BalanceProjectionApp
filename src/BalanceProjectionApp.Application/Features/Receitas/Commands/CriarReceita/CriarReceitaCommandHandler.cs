using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Colaboradores.Common;
using BalanceProjectionApp.Application.Features.Receitas.Common;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;

public class CriarReceitaCommandHandler(
    IReceitaRepository receitaRepository,
    IContaRepository contaRepository,
    IColaboradorRepository colaboradorRepository,
    IDespesaRepository despesaRepository,
    IComissaoDespesaSincronizador comissaoDespesaSincronizador,
    IUnitOfWork uow) : IRequestHandler<CriarReceitaCommand, Guid>
{
    public async Task<Guid> Handle(CriarReceitaCommand request, CancellationToken cancellationToken)
    {
        var conta = await contaRepository.ObterPorIdAsync(request.ContaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Conta), request.ContaId);

        var receita = Receita.Criar(request.Nome, conta.Id, request.Categoria, request.TemIva);

        foreach (var c in request.Comissoes ?? [])
        {
            var colaborador = await colaboradorRepository.ObterPorIdAsync(c.ColaboradorId, cancellationToken)
                ?? throw new EntityNotFoundException(nameof(Colaborador), c.ColaboradorId);
            receita.AdicionarComissao(colaborador, c.TipoComissao, c.Percentagem);
        }

        foreach (var p in request.Parcelas.OrderBy(p => p.Numero))
            receita.AdicionarParcela(p.Numero, p.DataVencimento, p.Valor);

        await receitaRepository.AdicionarAsync(receita, cancellationToken);

        if (request.TemIva)
        {
            var despesaIva = DespesaIvaFactory.Criar(
                request.Nome,
                conta.Id,
                request.Parcelas.Select(p => (p.Numero, p.DataVencimento, p.Valor)).ToList());

            await despesaRepository.AdicionarAsync(despesaIva, cancellationToken);
            receita.VincularDespesaIva(despesaIva.Id);
        }

        await uow.SaveChangesAsync(cancellationToken);

        var colaboradorIds = receita.Comissoes.Where(c => !c.IsDeleted).Select(c => c.ColaboradorId);
        var pares = ComissaoMesHelper.CalcularPares(colaboradorIds, receita.Parcelas.Select(p => p.DataVencimento));
        foreach (var par in pares)
            await comissaoDespesaSincronizador.RecalcularAsync(par.ColaboradorId, par.Mes, cancellationToken);

        return receita.Id;
    }
}
