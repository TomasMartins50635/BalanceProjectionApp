using BalanceProjectionApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BalanceProjectionApp.Infrastructure.Persistence.Configurations;

public class DespesaConfiguration : IEntityTypeConfiguration<Despesa>
{
    public void Configure(EntityTypeBuilder<Despesa> builder)
    {
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Nome).IsRequired().HasMaxLength(200);
        builder.Property(d => d.TipoDespesa).HasConversion<string>().IsRequired();
        builder.Property(d => d.Periodicidade).HasConversion<string>();
        builder.HasQueryFilter(d => !d.IsDeleted);

        builder.HasOne(d => d.Conta)
            .WithMany()
            .HasForeignKey(d => d.ContaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(d => d.Parcelas)
            .WithOne(p => p.Despesa)
            .HasForeignKey(p => p.DespesaId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
