using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.Infrastructure.Persistence.Repositories;

public class ContaRepository(AppDbContext context) : IContaRepository
{
    public Task<Conta?> ObterPorIdAsync(Guid id, CancellationToken ct = default)
        => context.Contas.FirstOrDefaultAsync(c => c.Id == id, ct);

    public async Task<IEnumerable<Conta>> ListarAsync(CancellationToken ct = default)
        => await context.Contas.ToListAsync(ct);

    public async Task AdicionarAsync(Conta conta, CancellationToken ct = default)
        => await context.Contas.AddAsync(conta, ct);
}
