using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.Infrastructure.Persistence.Repositories;

public class ParcelaRepository(AppDbContext context) : IParcelaRepository
{
    public Task<Parcela?> ObterPorIdAsync(Guid id, CancellationToken ct = default)
        => context.Parcelas.FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<IEnumerable<Parcela>> ListarPorReceitaAsync(Guid receitaId, CancellationToken ct = default)
        => await context.Parcelas
            .Where(p => p.ReceitaId == receitaId)
            .OrderBy(p => p.Numero)
            .ToListAsync(ct);

    public async Task<IEnumerable<Parcela>> ListarPorDespesaAsync(Guid despesaId, CancellationToken ct = default)
        => await context.Parcelas
            .Where(p => p.DespesaId == despesaId)
            .OrderBy(p => p.Numero)
            .ToListAsync(ct);

    public async Task<IEnumerable<Parcela>> ListarPorContaAsync(Guid contaId, CancellationToken ct = default)
        => await context.Parcelas
            .Where(p => p.ContaId == contaId)
            .Where(p => p.ReceitaId == null || p.Receita!.IsDeleted == false)
            .OrderBy(p => p.DataVencimento)
            .ThenBy(p => p.Numero)
            .ToListAsync(ct);
}
