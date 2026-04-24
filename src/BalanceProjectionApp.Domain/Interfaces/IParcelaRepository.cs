using BalanceProjectionApp.Domain.Entities;

namespace BalanceProjectionApp.Domain.Interfaces;

public interface IParcelaRepository
{
    Task<Parcela?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Parcela>> ListarPorReceitaAsync(Guid receitaId, CancellationToken cancellationToken = default);
    Task<IEnumerable<Parcela>> ListarPorDespesaAsync(Guid despesaId, CancellationToken cancellationToken = default);
    Task<IEnumerable<Parcela>> ListarPorContaAsync(Guid contaId, CancellationToken cancellationToken = default);
    Task AdicionarAsync(Parcela parcela, CancellationToken cancellationToken = default);
    void Remover(Parcela parcela);
}
