using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.Infrastructure.Persistence.Repositories;

public class ReceitaRepository(AppDbContext context) : IReceitaRepository
{
    public Task<Receita?> ObterPorIdAsync(Guid id, CancellationToken ct = default)
        => context.Receitas
            .Include(r => r.Comissao)
            .Include(r => r.Colaborador)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

    public Task<Receita?> ObterPorIdComParcelasAsync(Guid id, CancellationToken ct = default)
        => context.Receitas
            .Include(r => r.Comissao)
            .Include(r => r.Colaborador)
            .Include(r => r.Parcelas)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

    public async Task<IEnumerable<Receita>> ListarAsync(CancellationToken ct = default)
        => await context.Receitas
            .Include(r => r.Comissao)
            .Include(r => r.Colaborador)
            .Include(r => r.Parcelas)
            .ToListAsync(ct);

    public async Task AdicionarAsync(Receita receita, CancellationToken ct = default)
        => await context.Receitas.AddAsync(receita, ct);
}
