using BalanceProjectionApp.Domain.Entities;

namespace BalanceProjectionApp.Domain.Interfaces;

public interface IPrevisaoRepository
{
    Task<Previsao?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Previsao>> ListarPorContaAsync(Guid? contaId, CancellationToken cancellationToken = default);
    Task AdicionarAsync(Previsao previsao, CancellationToken cancellationToken = default);
}
