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
        foreach (var entry in ChangeTracker.Entries<Entity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Property(e => e.CreatedAt).CurrentValue = now;
                    entry.Property(e => e.UpdatedAt).CurrentValue = now;
                    break;
                case EntityState.Modified:
                    entry.Property(e => e.UpdatedAt).CurrentValue = now;
                    break;
            }
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
            // CreatedAt: gerado pelo DB no INSERT via DEFAULT NOW(), nunca alterado
            builder.Property<DateTime>("CreatedAt").HasDefaultValueSql("NOW()");
            // UpdatedAt: sempre enviado pelo C# — sem ValueGeneratedOnAdd, sem ambiguidade
            builder.Property<DateTime>("UpdatedAt").HasColumnType("timestamp with time zone");
            builder.Property<bool>("IsDeleted").HasDefaultValue(false);
        }

        base.OnModelCreating(modelBuilder);
    }
}
