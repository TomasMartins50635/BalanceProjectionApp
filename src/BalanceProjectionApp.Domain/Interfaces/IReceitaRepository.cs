using BalanceProjectionApp.Domain.Entities;

namespace BalanceProjectionApp.Domain.Interfaces;

public interface IReceitaRepository
{
    Task<Receita?> ObterPorIdAsync(Guid id, CancellationToken ct = default);
    Task<Receita?> ObterPorIdComParcelasAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<Receita>> ListarAsync(CancellationToken ct = default);
    Task AdicionarAsync(Receita receita, CancellationToken ct = default);
}
