using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BalanceProjectionApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveComissaoAddPercentagemComissao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Comissoes");

            migrationBuilder.AddColumn<decimal>(
                name: "PercentagemComissao",
                table: "Receitas",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PercentagemComissao",
                table: "Receitas");

            migrationBuilder.CreateTable(
                name: "Comissoes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReceitaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Percentagem = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Comissoes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Comissoes_Receitas_ReceitaId",
                        column: x => x.ReceitaId,
                        principalTable: "Receitas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Comissoes_ReceitaId",
                table: "Comissoes",
                column: "ReceitaId",
                unique: true);
        }
    }
}
