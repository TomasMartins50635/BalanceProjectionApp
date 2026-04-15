using BalanceProjectionApp.Domain.Entities;

namespace BalanceProjectionApp.Domain.Interfaces;

public interface IDespesaRepository
{
    Task<Despesa?> ObterPorIdAsync(Guid id, CancellationToken ct = default);
    Task<Despesa?> ObterPorIdComParcelasAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<Despesa>> ListarAsync(CancellationToken ct = default);
    Task AdicionarAsync(Despesa despesa, CancellationToken ct = default);
    void Remover(Despesa despesa);
}
