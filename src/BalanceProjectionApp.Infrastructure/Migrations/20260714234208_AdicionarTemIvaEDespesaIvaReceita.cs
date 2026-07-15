using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BalanceProjectionApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarTemIvaEDespesaIvaReceita : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DespesaIvaId",
                table: "Receitas",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TemIva",
                table: "Receitas",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Receitas_DespesaIvaId",
                table: "Receitas",
                column: "DespesaIvaId");

            migrationBuilder.AddForeignKey(
                name: "FK_Receitas_Despesas_DespesaIvaId",
                table: "Receitas",
                column: "DespesaIvaId",
                principalTable: "Despesas",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Receitas_Despesas_DespesaIvaId",
                table: "Receitas");

            migrationBuilder.DropIndex(
                name: "IX_Receitas_DespesaIvaId",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "DespesaIvaId",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "TemIva",
                table: "Receitas");
        }
    }
}
