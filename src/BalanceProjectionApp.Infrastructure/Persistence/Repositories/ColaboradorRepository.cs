using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.Infrastructure.Persistence.Repositories;

public class ColaboradorRepository(AppDbContext context) : IColaboradorRepository
{
    public Task<Colaborador?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Colaboradores.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task<IEnumerable<Colaborador>> ListarAsync(CancellationToken cancellationToken = default)
        => await context.Colaboradores.OrderBy(c => c.Nome).ToListAsync(cancellationToken);

    public async Task AdicionarAsync(Colaborador colaborador, CancellationToken cancellationToken = default)
        => await context.Colaboradores.AddAsync(colaborador, cancellationToken);

    public async Task<IEnumerable<ReceitaComissao>> ListarComissoesAsync(Guid colaboradorId, CancellationToken cancellationToken = default)
        => await context.ReceitaComissoes
            .Where(c => c.ColaboradorId == colaboradorId)
            .Include(c => c.Receita).ThenInclude(r => r.Parcelas)
            .ToListAsync(cancellationToken);
}
