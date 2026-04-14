using BalanceProjectionApp.Domain.Entities;

namespace BalanceProjectionApp.Domain.Interfaces;

public interface IColaboradorRepository
{
    Task<Colaborador?> ObterPorIdAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<Colaborador>> ListarAsync(CancellationToken ct = default);
    Task AdicionarAsync(Colaborador colaborador, CancellationToken ct = default);
}
