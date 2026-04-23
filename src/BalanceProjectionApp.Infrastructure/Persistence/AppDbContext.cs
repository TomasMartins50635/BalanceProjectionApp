using BalanceProjectionApp.Domain.Common;
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

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<Entity>()
            .Where(e => e.State == EntityState.Modified))
        {
            entry.Property(e => e.UpdatedAt).CurrentValue = now;
        }
        return base.SaveChangesAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
            .Where(t => typeof(Entity).IsAssignableFrom(t.ClrType)))
        {
            var builder = modelBuilder.Entity(entityType.ClrType);
            builder.Property<DateTime>("CreatedAt").HasDefaultValueSql("NOW()");
            builder.Property<DateTime>("UpdatedAt").HasDefaultValueSql("NOW()");
            builder.Property<bool>("IsDeleted").HasDefaultValue(false);
        }

        base.OnModelCreating(modelBuilder);
    }
}
