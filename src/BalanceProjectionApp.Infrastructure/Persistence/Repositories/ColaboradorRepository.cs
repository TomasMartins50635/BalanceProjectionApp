using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.Infrastructure.Persistence.Repositories;

public class ColaboradorRepository(AppDbContext context) : IColaboradorRepository
{
    public Task<Colaborador?> ObterPorIdAsync(Guid id, CancellationToken ct = default)
        => context.Colaboradores.FirstOrDefaultAsync(c => c.Id == id, ct);

    public async Task<IEnumerable<Colaborador>> ListarAsync(CancellationToken ct = default)
        => await context.Colaboradores.OrderBy(c => c.Nome).ToListAsync(ct);

    public async Task AdicionarAsync(Colaborador colaborador, CancellationToken ct = default)
        => await context.Colaboradores.AddAsync(colaborador, ct);
}
