using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.Infrastructure.Persistence.Repositories;

public class PrevisaoRepository(AppDbContext context) : IPrevisaoRepository
{
    public Task<Previsao?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Previsoes.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

    public async Task<IEnumerable<Previsao>> ListarPorContaAsync(Guid? contaId, CancellationToken cancellationToken = default)
        => await context.Previsoes
            .Where(p => p.ContaId == contaId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task AdicionarAsync(Previsao previsao, CancellationToken cancellationToken = default)
        => await context.Previsoes.AddAsync(previsao, cancellationToken);
}
