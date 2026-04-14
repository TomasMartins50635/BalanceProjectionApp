using BalanceProjectionApp.Domain.Entities;

namespace BalanceProjectionApp.Domain.Interfaces;

public interface IContaRepository
{
    Task<Conta?> ObterPorIdAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<Conta>> ListarAsync(CancellationToken ct = default);
    Task AdicionarAsync(Conta conta, CancellationToken ct = default);
    void Remover(Conta conta);
    Task<bool> TemEntidadesVinculadasAsync(Guid contaId, CancellationToken ct = default);
}
