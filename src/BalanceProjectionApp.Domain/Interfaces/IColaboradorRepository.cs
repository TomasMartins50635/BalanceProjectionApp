using BalanceProjectionApp.Domain.Entities;

namespace BalanceProjectionApp.Domain.Interfaces;

public interface IColaboradorRepository
{
    Task<Colaborador?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Colaborador>> ListarAsync(CancellationToken cancellationToken = default);
    Task AdicionarAsync(Colaborador colaborador, CancellationToken cancellationToken = default);
}
