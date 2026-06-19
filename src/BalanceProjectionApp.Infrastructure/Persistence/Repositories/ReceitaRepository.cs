using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.Infrastructure.Persistence.Repositories;

public class ReceitaRepository(AppDbContext context) : IReceitaRepository
{
    public Task<Receita?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Receitas
            .Include(r => r.Colaborador)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

    public Task<Receita?> ObterPorIdComParcelasAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Receitas
            .Include(r => r.Colaborador)
            .Include(r => r.Parcelas)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

    public async Task<IEnumerable<Receita>> ListarAsync(CancellationToken cancellationToken = default)
        => await context.Receitas
            .Include(r => r.Colaborador)
            .Include(r => r.Parcelas)
            .ToListAsync(cancellationToken);

    public async Task<IEnumerable<Receita>> ListarPorContaECategoriaAsync(Guid? contaId, CategoriaReceita categoria, CancellationToken cancellationToken = default)
        => await context.Receitas
            .Include(r => r.Parcelas)
            .Where(r => (contaId == null || r.ContaId == contaId) && r.Categoria == categoria)
            .ToListAsync(cancellationToken);

    public async Task AdicionarAsync(Receita receita, CancellationToken cancellationToken = default)
        => await context.Receitas.AddAsync(receita, cancellationToken);
}
