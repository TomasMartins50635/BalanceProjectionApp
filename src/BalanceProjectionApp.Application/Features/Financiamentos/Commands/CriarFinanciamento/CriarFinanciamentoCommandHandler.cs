using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Commands.CriarFinanciamento;

public class CriarFinanciamentoCommandHandler(
    IFinanciamentoRepository financiamentoRepository,
    IContaRepository contaRepository,
    IUnitOfWork uow) : IRequestHandler<CriarFinanciamentoCommand, Guid>
{
    public async Task<Guid> Handle(CriarFinanciamentoCommand request, CancellationToken ct)
    {
        var conta = await contaRepository.ObterPorIdAsync(request.ContaId, ct)
            ?? throw new EntityNotFoundException(nameof(Conta), request.ContaId);

        var financiamento = Financiamento.Criar(request.Nome, request.Valor, request.Data, conta.Id, request.DespesaId);

        // O financiamento credita o saldo imediatamente ao ser registado
        conta.Creditar(request.Valor);

        await financiamentoRepository.AdicionarAsync(financiamento, ct);
        await uow.SaveChangesAsync(ct);
        return financiamento.Id;
    }
}
