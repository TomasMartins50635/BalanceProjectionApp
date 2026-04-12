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

        builder.HasOne(r => r.Conta)
            .WithMany()
            .HasForeignKey(r => r.ContaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Comissao)
            .WithOne(c => c.Receita)
            .HasForeignKey<Comissao>(c => c.ReceitaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(r => r.Parcelas)
            .WithOne(p => p.Receita)
            .HasForeignKey(p => p.ReceitaId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
