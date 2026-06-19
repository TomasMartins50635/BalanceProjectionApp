using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BalanceProjectionApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarPrevisao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Previsoes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    DiasEntreVendas = table.Column<int>(type: "integer", nullable: true),
                    ValorMedioVenda = table.Column<decimal>(type: "numeric", nullable: true),
                    DiasEntreArrendamentos = table.Column<int>(type: "integer", nullable: true),
                    ValorMedioArrendamento = table.Column<decimal>(type: "numeric", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Previsoes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Previsoes_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Previsoes_ContaId",
                table: "Previsoes",
                column: "ContaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Previsoes");
        }
    }
}
