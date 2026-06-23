using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BalanceProjectionApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarComissoesColaboradores : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Receitas_Colaboradores_ColaboradorId",
                table: "Receitas");

            migrationBuilder.DropIndex(
                name: "IX_Receitas_ColaboradorId",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "ColaboradorId",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "Percentagem",
                table: "Colaboradores");

            migrationBuilder.AddColumn<decimal>(
                name: "PercentagemAngariacao",
                table: "Colaboradores",
                type: "TEXT",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PercentagemServico",
                table: "Colaboradores",
                type: "TEXT",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PercentagemVenda",
                table: "Colaboradores",
                type: "TEXT",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Tipo",
                table: "Colaboradores",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "ReceitaComissoes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ReceitaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ColaboradorId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TipoComissao = table.Column<string>(type: "TEXT", nullable: false),
                    Percentagem = table.Column<decimal>(type: "TEXT", precision: 5, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false, defaultValueSql: "datetime('now')"),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReceitaComissoes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReceitaComissoes_Colaboradores_ColaboradorId",
                        column: x => x.ColaboradorId,
                        principalTable: "Colaboradores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReceitaComissoes_Receitas_ReceitaId",
                        column: x => x.ReceitaId,
                        principalTable: "Receitas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReceitaComissoes_ColaboradorId",
                table: "ReceitaComissoes",
                column: "ColaboradorId");

            migrationBuilder.CreateIndex(
                name: "IX_ReceitaComissoes_ReceitaId",
                table: "ReceitaComissoes",
                column: "ReceitaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReceitaComissoes");

            migrationBuilder.DropColumn(
                name: "PercentagemAngariacao",
                table: "Colaboradores");

            migrationBuilder.DropColumn(
                name: "PercentagemServico",
                table: "Colaboradores");

            migrationBuilder.DropColumn(
                name: "PercentagemVenda",
                table: "Colaboradores");

            migrationBuilder.DropColumn(
                name: "Tipo",
                table: "Colaboradores");

            migrationBuilder.AddColumn<Guid>(
                name: "ColaboradorId",
                table: "Receitas",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Percentagem",
                table: "Colaboradores",
                type: "TEXT",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_Receitas_ColaboradorId",
                table: "Receitas",
                column: "ColaboradorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Receitas_Colaboradores_ColaboradorId",
                table: "Receitas",
                column: "ColaboradorId",
                principalTable: "Colaboradores",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
