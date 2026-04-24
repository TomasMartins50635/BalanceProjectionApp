using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.Infrastructure.Persistence.Repositories;

public class FinanciamentoRepository(AppDbContext context) : IFinanciamentoRepository
{
    public Task<Financiamento?> ObterPorIdAsync(Guid id, CancellationToken ct = default)
        => context.Financiamentos
            .Include(f => f.Despesa)
                .ThenInclude(d => d.Parcelas)
            .FirstOrDefaultAsync(f => f.Id == id, ct);

    public Task<Financiamento?> ObterPorDespesaIdAsync(Guid despesaId, CancellationToken ct = default)
        => context.Financiamentos
            .Include(f => f.Despesa)
                .ThenInclude(d => d.Parcelas)
            .FirstOrDefaultAsync(f => f.DespesaId == despesaId, ct);

    public async Task<IEnumerable<Financiamento>> ListarAsync(CancellationToken ct = default)
        => await context.Financiamentos
            .Include(f => f.Despesa)
                .ThenInclude(d => d.Parcelas)
            .ToListAsync(ct);

    public async Task<IEnumerable<Financiamento>> ListarPorContaAsync(Guid contaId, CancellationToken ct = default)
        => await context.Financiamentos
            .Include(f => f.Despesa)
                .ThenInclude(d => d.Parcelas)
            .Where(f => f.ContaId == contaId)
            .OrderBy(f => f.Data)
            .ToListAsync(ct);

    public async Task AdicionarAsync(Financiamento financiamento, CancellationToken ct = default)
        => await context.Financiamentos.AddAsync(financiamento, ct);
}
