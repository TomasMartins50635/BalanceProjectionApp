using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BalanceProjectionApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemovePercentagemComissaoFromReceita : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PercentagemComissao",
                table: "Receitas");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PercentagemComissao",
                table: "Receitas",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);
        }
    }
}
