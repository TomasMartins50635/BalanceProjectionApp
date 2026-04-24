using BalanceProjectionApp.Domain.Entities;

namespace BalanceProjectionApp.Domain.Interfaces;

public interface IFinanciamentoRepository
{
    Task<Financiamento?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Financiamento?> ObterPorDespesaIdAsync(Guid despesaId, CancellationToken cancellationToken = default);
    Task<IEnumerable<Financiamento>> ListarAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<Financiamento>> ListarPorContaAsync(Guid contaId, CancellationToken cancellationToken = default);
    Task AdicionarAsync(Financiamento financiamento, CancellationToken cancellationToken = default);
    void Remover(Financiamento financiamento);
}
