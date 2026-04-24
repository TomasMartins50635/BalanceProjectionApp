using BalanceProjectionApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BalanceProjectionApp.Infrastructure.Persistence.Configurations;

public class FinanciamentoConfiguration : IEntityTypeConfiguration<Financiamento>
{
    public void Configure(EntityTypeBuilder<Financiamento> builder)
    {
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Nome).IsRequired().HasMaxLength(200);
        builder.Property(f => f.Valor).HasPrecision(18, 2);
        builder.HasQueryFilter(f => !f.IsDeleted);

        builder.HasOne(f => f.Conta)
            .WithMany()
            .HasForeignKey(f => f.ContaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(f => f.Despesa)
            .WithMany()
            .HasForeignKey(f => f.DespesaId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
