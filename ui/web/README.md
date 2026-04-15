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

The dev server proxies `/api/*` to the ApiService at `http://localhost:5535`. Start the full backend with:

```bash
# from repo root
dotnet run --project BalanceProjectionApp.AppHost
```

## Views

| View | Description |
|---|---|
| **Visão Geral** | Consolidated overview — summary cards, 6-month income/expense/balance line chart, accounts table, recent activity feed |
| **Contas** | Account selector with date-filtered historical balance view and paginated parcelas table |
| **Receitas/Faturação** | Master-detail — searchable revenue list with detail tabs for general info, comissão configuration, and installment scheduling |
| **Despesas** | Master-detail — searchable expense list with detail tabs for general info (dynamic tags, recurring flag), payment summary, and installments |
| **Financiamentos** | Master-detail — financing records with linked expenses junction (dialog picker to associate/dissociate despesas) |
| **Modo Simulação** | Sandbox mode — add hypothetical revenue entries with installment splitting, visualise projected balance on a future date, compare real vs. simulated trend chart, save/load named scenarios |

## Project Structure

```
src/
  components/
    ui/             # Reusable primitives (Button, Input, Table, Select, Tabs, Switch, Dialog, Label)
    OverviewView.tsx
    Dashboard.tsx
    ReceitaView.tsx
    DespesaView.tsx
    FinanciamentoView.tsx
    SimulationView.tsx
  lib/
    utils.ts        # cn() helper (clsx + tailwind-merge)
  App.tsx           # Shell layout with dark sidebar navigation
  main.tsx
  index.css         # Tailwind base import + html/body/root height reset
```

## Scripts

```bash
npm run dev      # Start dev server with HMR
npm run build    # Type-check + production build → dist/
npm run preview  # Serve production build locally
npm run lint     # ESLint
```
