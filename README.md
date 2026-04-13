# BalanceProjectionApp

[![CI](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/build.yml/badge.svg)](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/build.yml)
[![Sonar](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/Sonar.yml/badge.svg)](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/Sonar.yml)

A financial management system focused on tracking **real and projected bank balances**, invoicing, and expenses. Built with .NET 10, Clean Architecture, and .NET Aspire.

## Overview

The core differentiator is that balances are calculated **installment by installment** — never from the total contract value. This ensures the balance always reflects actual cash flow.

## Architecture

Clean Architecture with the following layers:

| Project | Layer | Description |
|---|---|---|
| `Domain` | Domain | Entities, exceptions, repository interfaces |
| `Application` | Application | CQRS via MediatR, FluentValidation, DTOs |
| `Infrastructure` | Infrastructure | EF Core (SQLite), repositories, UnitOfWork |
| `ApiService` | Presentation | Minimal API endpoints |
| `Web` | Presentation | Blazor Server frontend |
| `AppHost` | Orchestration | .NET Aspire host |
| `ServiceDefaults` | Cross-cutting | OpenTelemetry, health checks, service discovery |

## Tech Stack

- **.NET 10** / C#
- **ASP.NET Core** Minimal API
- **Blazor Server**
- **.NET Aspire** for orchestration and observability
- **Entity Framework Core 10** with SQLite
- **MediatR 12** for CQRS
- **FluentValidation 11**

## Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [.NET Aspire workload](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/setup-tooling)

### Run

```bash
dotnet run --project BalanceProjectionApp.AppHost
```

| Service | URL |
|---|---|
| API | http://localhost:5535 |
| Web | http://localhost:5047 |
| Aspire Dashboard | http://localhost:15045 |
| OpenAPI schema | http://localhost:5535/openapi/v1.json |

### Database

SQLite, created automatically on first run in Development. To add a migration:

```bash
dotnet ef migrations add <MigrationName> \
  --project src/BalanceProjectionApp.Infrastructure \
  --startup-project src/BalanceProjectionApp.ApiService
```

## Key Concepts

- **Parcela (Installment)** — the core unit; only paid installments affect the balance.
- **Comissão (Commission)** — deducted at installment creation: `ValorLiquido = ValorBruto − (ValorBruto × Percentagem / 100)`.
- **Liquidar** — settling an installment credits (Receita) or debits (Despesa) the account atomically.
- **Financiamento** — external capital that credits the account immediately on registration.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/contas` | List / create accounts |
| `GET/POST` | `/receitas` | List / create revenue entries |
| `GET/POST` | `/despesas` | List / create expense entries |
| `GET` | `/parcelas/conta/{contaId}` | List installments (`?apenasPendentes=true`) |
| `POST` | `/parcelas/{id}/liquidar` | Settle an installment |
| `GET/POST` | `/financiamentos` | List / register financing |
