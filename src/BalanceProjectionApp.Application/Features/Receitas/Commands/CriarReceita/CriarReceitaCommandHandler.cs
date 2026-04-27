using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;

public class CriarReceitaCommandHandler(
    IReceitaRepository receitaRepository,
    IContaRepository contaRepository,
    IColaboradorRepository colaboradorRepository,
    IDespesaRepository despesaRepository,
    IUnitOfWork uow) : IRequestHandler<CriarReceitaCommand, Guid>
{
    public async Task<Guid> Handle(CriarReceitaCommand request, CancellationToken cancellationToken)
    {
        var conta = await contaRepository.ObterPorIdAsync(request.ContaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Conta), request.ContaId);

        var receita = Receita.Criar(request.Nome, conta.Id, request.Categoria);

        if (request.ColaboradorId.HasValue)
        {
            var colaborador = await colaboradorRepository.ObterPorIdAsync(request.ColaboradorId.Value, cancellationToken)
                ?? throw new EntityNotFoundException(nameof(Colaborador), request.ColaboradorId.Value);
            receita.AssociarColaborador(colaborador);
        }

        foreach (var p in request.Parcelas.OrderBy(p => p.Numero))
            receita.AdicionarParcela(p.Numero, p.DataVencimento, p.Valor);

        await receitaRepository.AdicionarAsync(receita, cancellationToken);

        if (request.TemIva)
        {
            var despesaIva = Despesa.Criar(
                $"IVA de {request.Nome}",
                conta.Id,
                CategoriaContrato.IVA,
                TipoDespesa.Pontual);

            var numeroParcela = 1;
            foreach (var p in request.Parcelas.OrderBy(x => x.Numero))
            {
                var valorIva = Math.Round(p.Valor * 0.23m, 2);
                var vencimentoIva = p.DataVencimento.Day < 25
                    ? new DateOnly(p.DataVencimento.Year, p.DataVencimento.Month, 25)
                    : new DateOnly(p.DataVencimento.Year, p.DataVencimento.Month, 25).AddMonths(1);
                despesaIva.AdicionarParcela(numeroParcela++, vencimentoIva, valorIva);
            }

            await despesaRepository.AdicionarAsync(despesaIva, cancellationToken);
        }

        await uow.SaveChangesAsync(cancellationToken);
        return receita.Id;
    }
}
