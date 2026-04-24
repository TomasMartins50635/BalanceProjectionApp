using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.Infrastructure.Persistence.Repositories;

public class DespesaRepository(AppDbContext context) : IDespesaRepository
{
    public Task<Despesa?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Despesas.FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

    public Task<Despesa?> ObterPorIdComParcelasAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Despesas
            .Include(d => d.Parcelas)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);

    public async Task<IEnumerable<Despesa>> ListarAsync(CancellationToken cancellationToken = default)
        => await context.Despesas
            .Include(d => d.Parcelas)
            .ToListAsync(cancellationToken);

    public async Task AdicionarAsync(Despesa despesa, CancellationToken cancellationToken = default)
        => await context.Despesas.AddAsync(despesa, cancellationToken);

    public void Remover(Despesa despesa)
        => context.Despesas.Remove(despesa);
}
