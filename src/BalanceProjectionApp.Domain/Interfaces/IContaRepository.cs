using BalanceProjectionApp.Domain.Entities;

namespace BalanceProjectionApp.Domain.Interfaces;

public interface IContaRepository
{
    Task<Conta?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Conta>> ListarAsync(CancellationToken cancellationToken = default);
    Task AdicionarAsync(Conta conta, CancellationToken cancellationToken = default);
    void Remover(Conta conta);
    Task<bool> TemEntidadesVinculadasAsync(Guid contaId, CancellationToken cancellationToken = default);
}
