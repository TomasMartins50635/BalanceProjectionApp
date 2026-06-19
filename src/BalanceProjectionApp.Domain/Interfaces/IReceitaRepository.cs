using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;

namespace BalanceProjectionApp.Domain.Interfaces;

public interface IReceitaRepository
{
    Task<Receita?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Receita?> ObterPorIdComParcelasAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Receita>> ListarAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<Receita>> ListarPorContaECategoriaAsync(Guid? contaId, CategoriaReceita categoria, CancellationToken cancellationToken = default);
    Task AdicionarAsync(Receita receita, CancellationToken cancellationToken = default);
}
