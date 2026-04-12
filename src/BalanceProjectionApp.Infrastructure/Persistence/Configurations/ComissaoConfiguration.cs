using BalanceProjectionApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BalanceProjectionApp.Infrastructure.Persistence.Configurations;

public class ComissaoConfiguration : IEntityTypeConfiguration<Comissao>
{
    public void Configure(EntityTypeBuilder<Comissao> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Percentagem).HasPrecision(5, 2);
    }
}
