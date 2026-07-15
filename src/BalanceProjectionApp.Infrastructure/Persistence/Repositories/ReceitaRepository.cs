using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.Infrastructure.Persistence.Repositories;

public class ReceitaRepository(AppDbContext context) : IReceitaRepository
{
    // IgnoreQueryFilters() removes the Colaborador soft-delete filter so that commissions
    // from deleted collaborators are still loaded. Filters for Receita, ReceitaComissao
    // and Parcela are re-applied explicitly via filtered includes / Where clauses.

    public Task<Receita?> ObterPorIdAsync(Guid id, CancellationToken cancellationToken = default)
        => BaseQuery()
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

    public Task<Receita?> ObterPorIdComParcelasAsync(Guid id, CancellationToken cancellationToken = default)
        => BaseQueryComParcelas()
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

    public Task<Receita?> ObterPorIdComComissoesAsync(Guid id, CancellationToken cancellationToken = default)
        => BaseQuery()
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

    public async Task<IEnumerable<Receita>> ListarAsync(CancellationToken cancellationToken = default)
        => await BaseQueryComParcelas().ToListAsync(cancellationToken);

    public async Task<IEnumerable<Receita>> ListarPorContaECategoriaAsync(Guid? contaId, CategoriaReceita categoria, CancellationToken cancellationToken = default)
        => await BaseQueryComParcelas()
            .Where(r => (contaId == null || r.ContaId == contaId) && r.Categoria == categoria)
            .ToListAsync(cancellationToken);

    public async Task AdicionarAsync(Receita receita, CancellationToken cancellationToken = default)
        => await context.Receitas.AddAsync(receita, cancellationToken);

    public async Task AdicionarComissaoAsync(ReceitaComissao comissao, CancellationToken cancellationToken = default)
        => await context.ReceitaComissoes.AddAsync(comissao, cancellationToken);

    public Task<ReceitaComissao?> ObterComissaoPorIdAsync(Guid receitaId, Guid comissaoId, CancellationToken cancellationToken = default)
        => context.ReceitaComissoes
            .FirstOrDefaultAsync(c => c.Id == comissaoId && c.ReceitaId == receitaId, cancellationToken);

    private IQueryable<Receita> BaseQuery()
        => context.Receitas
            .IgnoreQueryFilters()
            .Where(r => !r.IsDeleted)
            .Include(r => r.Comissoes.Where(c => !c.IsDeleted))
                .ThenInclude(c => c.Colaborador);

    private IQueryable<Receita> BaseQueryComParcelas()
        => context.Receitas
            .IgnoreQueryFilters()
            .Where(r => !r.IsDeleted)
            .Include(r => r.Comissoes.Where(c => !c.IsDeleted))
                .ThenInclude(c => c.Colaborador)
            .Include(r => r.Parcelas.Where(p => !p.IsDeleted))
            .Include(r => r.DespesaIva)
                .ThenInclude(d => d!.Parcelas.Where(p => !p.IsDeleted));
}
