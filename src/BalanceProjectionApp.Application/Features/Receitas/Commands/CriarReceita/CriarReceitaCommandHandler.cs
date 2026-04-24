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

        var receita = Receita.Criar(request.Nome, conta.Id, request.ValorTotal, request.Categoria);

        if (request.ColaboradorId.HasValue)
        {
            var colaborador = await colaboradorRepository.ObterPorIdAsync(request.ColaboradorId.Value, cancellationToken)
                ?? throw new EntityNotFoundException(nameof(Colaborador), request.ColaboradorId.Value);
            receita.AssociarColaborador(colaborador);
        }

        foreach (var p in request.Parcelas.OrderBy(p => p.Numero))
            receita.AdicionarParcela(p.Numero, p.DataVencimento, p.Percentagem);

        await receitaRepository.AdicionarAsync(receita, cancellationToken);

        if (request.TemIva)
        {
            var valorIva = Math.Round(request.ValorTotal * 0.23m, 2);
            var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
            var vencimentoIva = new DateOnly(hoje.Year, hoje.Month, 20);

            var despesaIva = Despesa.Criar(
                $"IVA de {request.Nome}",
                conta.Id,
                CategoriaContrato.IVA,
                TipoDespesa.Pontual);

            despesaIva.AdicionarParcela(1, vencimentoIva, valorIva);
            await despesaRepository.AdicionarAsync(despesaIva, cancellationToken);
        }

        await uow.SaveChangesAsync(cancellationToken);
        return receita.Id;
    }
}
