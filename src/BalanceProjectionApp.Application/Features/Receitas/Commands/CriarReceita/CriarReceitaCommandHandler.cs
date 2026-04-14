using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;

public class CriarReceitaCommandHandler(
    IReceitaRepository receitaRepository,
    IContaRepository contaRepository,
    IColaboradorRepository colaboradorRepository,
    IUnitOfWork uow) : IRequestHandler<CriarReceitaCommand, Guid>
{
    public async Task<Guid> Handle(CriarReceitaCommand request, CancellationToken ct)
    {
        var conta = await contaRepository.ObterPorIdAsync(request.ContaId, ct)
            ?? throw new EntityNotFoundException(nameof(Conta), request.ContaId);

        var receita = Receita.Criar(request.Nome, conta.Id, request.ValorTotal, request.Categoria);

        if (request.ColaboradorId.HasValue)
        {
            var colaborador = await colaboradorRepository.ObterPorIdAsync(request.ColaboradorId.Value, ct)
                ?? throw new EntityNotFoundException(nameof(Colaborador), request.ColaboradorId.Value);
            receita.AssociarColaborador(colaborador);
        }

        foreach (var p in request.Parcelas.OrderBy(p => p.Numero))
            receita.AdicionarParcela(p.Numero, p.DataVencimento, p.Percentagem);

        await receitaRepository.AdicionarAsync(receita, ct);
        await uow.SaveChangesAsync(ct);
        return receita.Id;
    }
}
