using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.Infrastructure.Persistence.Repositories;

public class FinanciamentoRepository(AppDbContext context) : IFinanciamentoRepository
{
    public Task<Financiamento?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Financiamentos
            .Include(f => f.Despesa)
                .ThenInclude(d => d.Parcelas)
            .FirstOrDefaultAsync(f => f.Id == id, cancellationToken);

    public Task<Financiamento?> ObterPorDespesaIdAsync(Guid despesaId, CancellationToken cancellationToken = default)
        => context.Financiamentos
            .Include(f => f.Despesa)
                .ThenInclude(d => d.Parcelas)
            .FirstOrDefaultAsync(f => f.DespesaId == despesaId, cancellationToken);

    public async Task<IEnumerable<Financiamento>> ListarAsync(CancellationToken cancellationToken = default)
        => await context.Financiamentos
            .Include(f => f.Despesa)
                .ThenInclude(d => d.Parcelas)
            .ToListAsync(cancellationToken);

    public async Task<IEnumerable<Financiamento>> ListarPorContaAsync(Guid contaId, CancellationToken cancellationToken = default)
        => await context.Financiamentos
            .Include(f => f.Despesa)
                .ThenInclude(d => d.Parcelas)
            .Where(f => f.ContaId == contaId)
            .OrderBy(f => f.Data)
            .ToListAsync(cancellationToken);

    public async Task AdicionarAsync(Financiamento financiamento, CancellationToken cancellationToken = default)
        => await context.Financiamentos.AddAsync(financiamento, cancellationToken);

    public void Remover(Financiamento financiamento)
        => context.Financiamentos.Remove(financiamento);
}
