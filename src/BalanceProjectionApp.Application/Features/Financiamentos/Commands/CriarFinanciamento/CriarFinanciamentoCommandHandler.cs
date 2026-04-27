using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Commands.CriarFinanciamento;

public class CriarFinanciamentoCommandHandler(
    IFinanciamentoRepository financiamentoRepository,
    IDespesaRepository despesaRepository,
    IContaRepository contaRepository,
    IUnitOfWork uow) : IRequestHandler<CriarFinanciamentoCommand, Guid>
{
    public async Task<Guid> Handle(CriarFinanciamentoCommand request, CancellationToken cancellationToken)
    {
        var conta = await contaRepository.ObterPorIdAsync(request.ContaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Conta), request.ContaId);

        if (request.ValorPrestacao > request.Valor)
            throw new DomainException("A prestação não pode ultrapassar o valor do financiamento.");

        var despesa = Despesa.Criar(
            request.Nome,
            conta.Id,
            CategoriaContrato.Financiamento,
            TipoDespesa.Fixa,
            request.ValorPrestacao,
            request.Periodicidade,
            request.DataPrimeiraParcela);

        despesa.GerarProximaParcela();

        var financiamento = Financiamento.Criar(request.Nome, request.Valor,
            DateOnly.FromDateTime(DateTime.UtcNow),
            conta.Id, despesa.Id);

        conta.Creditar(request.Valor);

        await despesaRepository.AdicionarAsync(despesa, cancellationToken);
        await financiamentoRepository.AdicionarAsync(financiamento, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return financiamento.Id;
    }
}
