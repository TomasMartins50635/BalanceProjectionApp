using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BalanceProjectionApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FinancialModelChanges : Migration
    {
    /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ValorTotal",
                table: "Receitas");

            // Drop the old string Categoria column and add new integer Categoria
            migrationBuilder.Sql("ALTER TABLE \"Receitas\" DROP COLUMN \"Categoria\"");
            
            migrationBuilder.AddColumn<int>(
                name: "Categoria",
                table: "Receitas",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Categoria",
                table: "Receitas");

            migrationBuilder.AddColumn<string>(
                name: "Categoria",
                table: "Receitas",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ValorTotal",
                table: "Receitas",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }
    }
}
