using BalanceProjectionApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BalanceProjectionApp.Infrastructure.Persistence.Configurations;

public class ReceitaConfiguration : IEntityTypeConfiguration<Receita>
{
    public void Configure(EntityTypeBuilder<Receita> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Nome).IsRequired().HasMaxLength(200);
        builder.Property(r => r.Categoria).HasMaxLength(100);
        builder.Property(r => r.ValorTotal).HasPrecision(18, 2);
        builder.Property(r => r.IsDeleted).HasDefaultValue(false);
        builder.HasQueryFilter(r => !r.IsDeleted);

        builder.HasOne(r => r.Conta)
            .WithMany()
            .HasForeignKey(r => r.ContaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Colaborador)
            .WithMany()
            .HasForeignKey(r => r.ColaboradorId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(r => r.Parcelas)
            .WithOne(p => p.Receita)
            .HasForeignKey(p => p.ReceitaId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
