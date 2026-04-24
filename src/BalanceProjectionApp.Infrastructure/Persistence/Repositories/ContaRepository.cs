using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.Infrastructure.Persistence.Repositories;

public class ContaRepository(AppDbContext context) : IContaRepository
{
    public Task<Conta?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Contas.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task<IEnumerable<Conta>> ListarAsync(CancellationToken cancellationToken = default)
        => await context.Contas.ToListAsync(cancellationToken);

    public async Task AdicionarAsync(Conta conta, CancellationToken cancellationToken = default)
        => await context.Contas.AddAsync(conta, cancellationToken);

    public void Remover(Conta conta)
        => context.Contas.Remove(conta);

    public async Task<bool> TemEntidadesVinculadasAsync(Guid contaId, CancellationToken cancellationToken = default)
        => await context.Receitas.AnyAsync(r => r.ContaId == contaId, cancellationToken)
        || await context.Despesas.AnyAsync(d => d.ContaId == contaId, cancellationToken)
        || await context.Financiamentos.AnyAsync(f => f.ContaId == contaId, cancellationToken);
}
