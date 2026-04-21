using BalanceProjectionApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BalanceProjectionApp.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Conta> Contas => Set<Conta>();
    public DbSet<Receita> Receitas => Set<Receita>();
    public DbSet<Despesa> Despesas => Set<Despesa>();
    public DbSet<Parcela> Parcelas => Set<Parcela>();
    public DbSet<Financiamento> Financiamentos => Set<Financiamento>();
    public DbSet<Colaborador> Colaboradores => Set<Colaborador>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
