# BalanceProjectionApp — Web Frontend

React + Vite frontend for the BalanceProjectionApp financial management system. Designed from a Figma prototype and connected to the .NET ApiService backend.

## Tech Stack

| | |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| UI Primitives | Radix UI (Dialog, Select, Tabs, Switch, Label) |
| Charts | Recharts |
| Icons | lucide-react |

## Getting Started

```bash
npm install
npm run dev
```

App runs at **http://localhost:5173**.

The dev server proxies `/api/*` to the ApiService at `http://localhost:5535`. Start the backend with:

```bash
# from repo root
docker compose up db -d
dotnet run --project src/BalanceProjectionApp.ApiService
```

## Views

| View | Description |
|---|---|
| **Visão Geral** | Consolidated overview — summary cards, 6-month income/expense/balance line chart, accounts table, recent activity feed |
| **Contas** | Account selector with date-filtered historical balance view and paginated parcelas table |
| **Receitas/Faturação** | Master-detail — searchable revenue list; create form includes optional collaborator (commission) and IVA toggle (auto-generates IVA despesa at 23%); installment scheduling by percentage |
| **Despesas** | Master-detail — supports Pontual, Fixa (with periodicidade), and Recorrente types; next installment auto-generated on settlement for Fixa/Recorrente |
| **Financiamentos** | Master-detail — financing records with optional linked despesa |
| **Modo Simulação** | Sandbox mode — add hypothetical revenue entries, visualise projected balance on a future date, compare real vs. simulated trend chart |

## Project Structure

```
src/
  components/
    ui/                  # Reusable primitives (Button, Input, Table, Select, Tabs, Dialog, ConfirmDialog…)
    LiquidarDialog.tsx   # Shared dialog for settling installments (date picker)
    ParcelasTable.tsx    # Shared installments table (receita / despesa variants)
    ReceitaView.tsx
    DespesaView.tsx
    FinanciamentoView.tsx
    OverviewView.tsx
    SimulationView.tsx
  hooks/
    useParcelaActions.ts # liquidar / estornar state + handlers (shared across views)
    useAsync.ts          # Generic data-fetching hook
    useToast.ts          # Toast notifications
  lib/
    api.ts               # All API calls
    types.ts             # TypeScript types matching backend DTOs
    utils.ts             # cn() helper (clsx + tailwind-merge)
  App.tsx                # Shell layout with dark sidebar navigation
  main.tsx
  index.css              # Tailwind base import + html/body/root height reset
```

## Scripts

```bash
npm run dev      # Start dev server with HMR
npm run build    # Type-check + production build → dist/
npm run preview  # Serve production build locally
npm run lint     # ESLint
```
