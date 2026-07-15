using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BalanceProjectionApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarComissaoDespesa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ColaboradorId",
                table: "Despesas",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "MesReferencia",
                table: "Despesas",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Despesas_ColaboradorId_MesReferencia",
                table: "Despesas",
                columns: new[] { "ColaboradorId", "MesReferencia" });

            migrationBuilder.AddForeignKey(
                name: "FK_Despesas_Colaboradores_ColaboradorId",
                table: "Despesas",
                column: "ColaboradorId",
                principalTable: "Colaboradores",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Despesas_Colaboradores_ColaboradorId",
                table: "Despesas");

            migrationBuilder.DropIndex(
                name: "IX_Despesas_ColaboradorId_MesReferencia",
                table: "Despesas");

            migrationBuilder.DropColumn(
                name: "ColaboradorId",
                table: "Despesas");

            migrationBuilder.DropColumn(
                name: "MesReferencia",
                table: "Despesas");
        }
    }
}
