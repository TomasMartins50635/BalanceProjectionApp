using BalanceProjectionApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BalanceProjectionApp.Infrastructure.Persistence.Configurations;

public class ColaboradorConfiguration : IEntityTypeConfiguration<Colaborador>
{
    public void Configure(EntityTypeBuilder<Colaborador> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Nome).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Tipo).HasConversion<string>();
        builder.Property(c => c.PercentagemVenda).HasPrecision(5, 2);
        builder.Property(c => c.PercentagemAngariacao).HasPrecision(5, 2);
        builder.Property(c => c.PercentagemServico).HasPrecision(5, 2);
        builder.HasQueryFilter(c => !c.IsDeleted);
    }
}
