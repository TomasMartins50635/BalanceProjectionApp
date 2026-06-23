using BalanceProjectionApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BalanceProjectionApp.Infrastructure.Persistence.Configurations;

public class ReceitaComissaoConfiguration : IEntityTypeConfiguration<ReceitaComissao>
{
    public void Configure(EntityTypeBuilder<ReceitaComissao> builder)
    {
        builder.HasKey(c => c.Id);
        builder.ToTable("ReceitaComissoes");

        builder.Property(c => c.TipoComissao).HasConversion<string>();
        builder.Property(c => c.Percentagem).HasPrecision(5, 2);

        builder.HasOne(c => c.Receita)
            .WithMany(r => r.Comissoes)
            .HasForeignKey(c => c.ReceitaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.Colaborador)
            .WithMany()
            .HasForeignKey(c => c.ColaboradorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(c => !c.IsDeleted);
    }
}
