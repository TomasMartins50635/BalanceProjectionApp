using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.Infrastructure.Persistence.Repositories;

public class ParcelaRepository(AppDbContext context) : IParcelaRepository
{
    public Task<Parcela?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Parcelas.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

    public async Task<IEnumerable<Parcela>> ListarPorReceitaAsync(Guid receitaId, CancellationToken cancellationToken = default)
        => await context.Parcelas
            .Where(p => p.ReceitaId == receitaId)
            .OrderBy(p => p.Numero)
            .ToListAsync(cancellationToken);

    public async Task<IEnumerable<Parcela>> ListarPorDespesaAsync(Guid despesaId, CancellationToken cancellationToken = default)
        => await context.Parcelas
            .Where(p => p.DespesaId == despesaId)
            .OrderBy(p => p.Numero)
            .ToListAsync(cancellationToken);

    public async Task<IEnumerable<Parcela>> ListarPorContaAsync(Guid contaId, CancellationToken cancellationToken = default)
        => await context.Parcelas
            .Include(p => p.Receita)
            .Include(p => p.Despesa)
            .Where(p => p.ContaId == contaId)
            .Where(p => p.ReceitaId == null || p.Receita!.IsDeleted == false)
            .OrderBy(p => p.DataVencimento)
            .ThenBy(p => p.Numero)
            .ToListAsync(cancellationToken);

    public async Task AdicionarAsync(Parcela parcela, CancellationToken cancellationToken = default)
        => await context.Parcelas.AddAsync(parcela, cancellationToken);

    public void Remover(Parcela parcela)
        => context.Parcelas.Remove(parcela);
}
