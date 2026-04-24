using BalanceProjectionApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BalanceProjectionApp.Infrastructure.Persistence.Configurations;

public class ParcelaConfiguration : IEntityTypeConfiguration<Parcela>
{
    public void Configure(EntityTypeBuilder<Parcela> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.ValorBruto).HasPrecision(18, 2);
        builder.Property(p => p.ValorLiquido).HasPrecision(18, 2);
        builder.Property(p => p.Percentagem).HasPrecision(5, 2);
        builder.HasQueryFilter(p => !p.IsDeleted);

        // Índices para queries frequentes
        builder.HasIndex(p => p.ContaId);
        builder.HasIndex(p => new { p.ContaId, p.IsPaid });
        builder.HasIndex(p => p.DataVencimento);
    }
}
