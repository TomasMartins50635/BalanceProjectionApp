using BalanceProjectionApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BalanceProjectionApp.Infrastructure.Persistence.Configurations;

public class PrevisaoConfiguration : IEntityTypeConfiguration<Previsao>
{
    public void Configure(EntityTypeBuilder<Previsao> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Nome).IsRequired().HasMaxLength(200);
        builder.HasQueryFilter(p => !p.IsDeleted);

        builder.HasOne(p => p.Conta)
            .WithMany()
            .HasForeignKey(p => p.ContaId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
