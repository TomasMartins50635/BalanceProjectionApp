using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BalanceProjectionApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ParcelaSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Parcelas_Despesas_DespesaId",
                table: "Parcelas");

            migrationBuilder.AddForeignKey(
                name: "FK_Parcelas_Despesas_DespesaId",
                table: "Parcelas",
                column: "DespesaId",
                principalTable: "Despesas",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Parcelas_Despesas_DespesaId",
                table: "Parcelas");

            migrationBuilder.AddForeignKey(
                name: "FK_Parcelas_Despesas_DespesaId",
                table: "Parcelas",
                column: "DespesaId",
                principalTable: "Despesas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
