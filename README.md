# BalanceProjectionApp

[![CI](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/build.yml/badge.svg)](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/build.yml)
[![Sonar](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/Sonar.yml/badge.svg)](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/Sonar.yml)

A financial management system focused on tracking **real and projected bank balances**, invoicing, and expenses. Built with .NET 10 (Clean Architecture) and React + Vite.

## Overview

The core differentiator is that balances are calculated **installment by installment** — never from the total contract value. Only paid installments affect the account balance, ensuring it always reflects actual cash flow.

## Architecture

Clean Architecture with the following layers:

| Project | Layer | Description |
|---|---|---|
| `Domain` | Domain | Entities, exceptions, repository interfaces |
| `Application` | Application | CQRS via MediatR, FluentValidation, DTOs |
| `Infrastructure` | Infrastructure | EF Core (PostgreSQL), repositories, UnitOfWork |
| `ApiService` | Presentation | ASP.NET Core Web API (Controllers) |

## Tech Stack

**Backend**
- **.NET 10** / C#
- **ASP.NET Core** Web API
- **Entity Framework Core 10** with PostgreSQL (Npgsql)
- **MediatR 12** for CQRS
- **FluentValidation 11**

**Frontend**
- **React 19** + **Vite**
- **TypeScript**
- **Tailwind CSS v4**
- **Radix UI** (shadcn/ui components)
- **Recharts** for charts

**Desktop** (optional)
- **Tauri** wrapper around the React web app

## Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (for PostgreSQL)

### Run everything

```bash
# Start the database
docker compose up db -d

# Start the API (http://localhost:5535)
dotnet run --project src/BalanceProjectionApp.ApiService

# Start the web frontend (http://localhost:5173)
cd ui/web && npm install && npm run dev
```

Or run the full stack in Docker:

```bash
docker compose up --build
```

### Desktop app

```bash
cd ui/desktop && npm install && npm run dev
```

This starts the Tauri app which embeds the React web frontend.

## Database

PostgreSQL via Docker. Schema is applied automatically on startup (`MigrateAsync`).

To add a migration:

```bash
dotnet ef migrations add <MigrationName> \
  --project src/BalanceProjectionApp.Infrastructure \
  --startup-project src/BalanceProjectionApp.ApiService
```

## Key Concepts

- **Parcela (Installment)** — the core unit; only paid installments affect the balance.
- **Comissão (Commission)** — deducted at installment creation via the associated `Colaborador.Percentagem`: `ValorLiquido = ValorBruto − (ValorBruto × Colaborador.Percentagem / 100)`. No separate commission entity exists.
- **IVA** — when creating a `Receita` with `temIva: true`, a Pontual `Despesa` named `"IVA de {nome}"` is automatically created with a single installment at 23% of the total value, due on the 20th of the current month.
- **Liquidar** — settling an installment credits (Receita) or debits (Despesa) the account atomically.
- **Estornar** — reverses a settled installment and restores the account balance (requires confirmation).
- **Financiamento** — external capital that credits the account immediately on registration and auto-creates a linked active fixed expense with `valorMensalidade`, including the first installment.
- **Financiamento Cap** — total paid amount across installments of an expense linked to a financing cannot exceed the financed value.
- **Despesa Fixa / Recorrente** — recurring expense; the next installment is generated automatically after the current one is settled.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/contas` | List accounts |
| `POST` | `/contas` | Create account |
| `GET` | `/contas/{id}` | Get account with current balance |
| `DELETE` | `/contas/{id}` | Delete account |
| `GET` | `/receitas` | List revenue entries with installments |
| `POST` | `/receitas` | Create revenue entry |
| `PUT` | `/receitas/{id}` | Update revenue entry |
| `DELETE` | `/receitas/{id}` | Delete revenue entry |
| `GET` | `/despesas` | List expense entries with installments |
| `POST` | `/despesas` | Create expense entry |
| `PUT` | `/despesas/{id}` | Update expense entry |
| `PATCH` | `/despesas/{id}/estado` | Activate / deactivate a Fixa expense |
| `DELETE` | `/despesas/{id}` | Delete expense entry |
| `GET` | `/parcelas/conta/{contaId}` | List installments (`?apenasPendentes=true`) |
| `POST` | `/parcelas/{id}/liquidar` | Settle an installment |
| `POST` | `/parcelas/{id}/estornar` | Reverse a settled installment |
| `DELETE` | `/parcelas/{id}` | Delete a pending installment |
| `GET` | `/colaboradores` | List collaborators |
| `POST` | `/colaboradores` | Create collaborator |
| `DELETE` | `/colaboradores/{id}` | Delete collaborator |
| `GET` | `/financiamentos/conta/{contaId}` | List financing entries |
| `POST` | `/financiamentos` | Register financing (`nome`, `valor`, `contaId`, `valorMensalidade`) with immediate date, linked active fixed expense, and immediate account credit |

## Tests

| Project | Type | Coverage |
|---|---|---|
| `Domain.Tests` | Unit | Entities and domain rules |
| `Application.Tests` | Unit (mocks) | CQRS handlers with NSubstitute |
| `Infrastructure.Tests` | Integration | EF Core repositories against real PostgreSQL (Testcontainers) |
| `Api.Tests` | E2E | HTTP endpoints via WebApplicationFactory + Testcontainers |

```bash
dotnet test tests/BalanceProjectionApp.Domain.Tests
dotnet test tests/BalanceProjectionApp.Application.Tests
dotnet test tests/BalanceProjectionApp.Infrastructure.Tests   # requires Docker
dotnet test tests/BalanceProjectionApp.Api.Tests              # requires Docker
```

## Frontend Structure

```
ui/web/src/
  components/          # Page-level views and shared UI components
    LiquidarDialog     # Shared dialog for settling installments
    ParcelasTable      # Shared installments table (receita / despesa variants)
    ...
  hooks/
    useParcelaActions  # Shared hook: liquidar, estornar, sort state
    useAsync           # Generic data fetching hook
    useToast           # Toast notifications
  lib/
    api.ts             # All API calls
    types.ts           # TypeScript types matching backend DTOs
```
