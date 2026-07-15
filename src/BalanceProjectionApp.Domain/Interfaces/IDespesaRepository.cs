using BalanceProjectionApp.Domain.Entities;

namespace BalanceProjectionApp.Domain.Interfaces;

public interface IDespesaRepository
{
    Task<Despesa?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Despesa?> ObterPorIdComParcelasAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Despesa?> ObterPorColaboradorEMesAsync(Guid colaboradorId, DateOnly mesReferencia, CancellationToken cancellationToken = default);
    Task<IEnumerable<Despesa>> ListarAsync(CancellationToken cancellationToken = default);
    Task AdicionarAsync(Despesa despesa, CancellationToken cancellationToken = default);
    void Remover(Despesa despesa);
}
