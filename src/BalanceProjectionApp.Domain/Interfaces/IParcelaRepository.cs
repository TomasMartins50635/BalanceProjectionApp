using BalanceProjectionApp.Domain.Entities;

namespace BalanceProjectionApp.Domain.Interfaces;

public interface IParcelaRepository
{
    Task<Parcela?> ObterPorIdAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<Parcela>> ListarPorReceitaAsync(Guid receitaId, CancellationToken ct = default);
    Task<IEnumerable<Parcela>> ListarPorDespesaAsync(Guid despesaId, CancellationToken ct = default);
    Task<IEnumerable<Parcela>> ListarPorContaAsync(Guid contaId, CancellationToken ct = default);
    void Remover(Parcela parcela);
}
