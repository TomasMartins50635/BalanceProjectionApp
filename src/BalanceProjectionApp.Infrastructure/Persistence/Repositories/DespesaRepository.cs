using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.Infrastructure.Persistence.Repositories;

public class DespesaRepository(AppDbContext context) : IDespesaRepository
{
    public Task<Despesa?> ObterPorIdAsync(Guid id, CancellationToken ct = default)
        => context.Despesas.FirstOrDefaultAsync(d => d.Id == id, ct);

    public Task<Despesa?> ObterPorIdComParcelasAsync(Guid id, CancellationToken ct = default)
        => context.Despesas
            .Include(d => d.Parcelas)
            .FirstOrDefaultAsync(d => d.Id == id, ct);

    public async Task<IEnumerable<Despesa>> ListarAsync(CancellationToken ct = default)
        => await context.Despesas
            .Include(d => d.Parcelas)
            .ToListAsync(ct);

    public async Task AdicionarAsync(Despesa despesa, CancellationToken ct = default)
        => await context.Despesas.AddAsync(despesa, ct);

    public void Remover(Despesa despesa)
        => context.Despesas.Remove(despesa);
}
