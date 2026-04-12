using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.CriarDespesa;

public class CriarDespesaCommandHandler(
    IDespesaRepository despesaRepository,
    IContaRepository contaRepository,
    IUnitOfWork uow) : IRequestHandler<CriarDespesaCommand, Guid>
{
    public async Task<Guid> Handle(CriarDespesaCommand request, CancellationToken ct)
    {
        var conta = await contaRepository.ObterPorIdAsync(request.ContaId, ct)
            ?? throw new EntityNotFoundException(nameof(Conta), request.ContaId);

        var despesa = Despesa.Criar(request.Nome, conta.Id, request.Categoria);

        foreach (var p in request.Parcelas.OrderBy(p => p.Numero))
            despesa.AdicionarParcela(p.Numero, p.DataVencimento, p.ValorBruto);

        await despesaRepository.AdicionarAsync(despesa, ct);
        await uow.SaveChangesAsync(ct);
        return despesa.Id;
    }
}
