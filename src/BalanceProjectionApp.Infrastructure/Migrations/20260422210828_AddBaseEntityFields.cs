using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BalanceProjectionApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBaseEntityFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Receitas",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Receitas",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Parcelas",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Parcelas",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Parcelas",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Financiamentos",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Financiamentos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Financiamentos",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Despesas",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Despesas",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Despesas",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Contas",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Contas",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Contas",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Colaboradores",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Colaboradores",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Parcelas");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Parcelas");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Parcelas");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Financiamentos");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Financiamentos");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Financiamentos");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Despesas");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Despesas");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Despesas");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Contas");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Contas");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Contas");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Colaboradores");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Colaboradores");
        }
    }
}
