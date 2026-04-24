using BalanceProjectionApp.Domain.Entities;

namespace BalanceProjectionApp.Domain.Interfaces;

public interface IFinanciamentoRepository
{
    Task<Financiamento?> ObterPorIdAsync(Guid id, CancellationToken ct = default);
    Task<Financiamento?> ObterPorDespesaIdAsync(Guid despesaId, CancellationToken ct = default);
    Task<IEnumerable<Financiamento>> ListarAsync(CancellationToken ct = default);
    Task<IEnumerable<Financiamento>> ListarPorContaAsync(Guid contaId, CancellationToken ct = default);
    Task AdicionarAsync(Financiamento financiamento, CancellationToken ct = default);
}
