# BalanceProjectionApp

[![CI](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/build.yml/badge.svg)](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/build.yml)
[![Sonar](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/Sonar.yml/badge.svg)](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/Sonar.yml)

Sistema de gestão financeira focado no controlo de **saldo bancário real e previsto**, faturação e despesas. O saldo é calculado **parcela a parcela** — nunca pelo valor total dos contratos.

---

## Arquitectura

Clean Architecture com 4 camadas:

| Projeto | Camada | Responsabilidade |
|---|---|---|
| `Domain` | Domain | Entidades, regras de negócio, interfaces de repositório |
| `Application` | Application | CQRS via MediatR, FluentValidation, DTOs |
| `Infrastructure` | Infrastructure | EF Core + SQLite, repositórios, UnitOfWork |
| `ApiService` | Presentation | Minimal API endpoints, registo DI, middleware |

```
src/
├── BalanceProjectionApp.Domain/
├── BalanceProjectionApp.Application/
├── BalanceProjectionApp.Infrastructure/
└── BalanceProjectionApp.ApiService/

ui/
├── web/        # React + Vite (fonte de verdade do frontend)
└── desktop/    # Tauri wrapper — inclui a API .NET como sidecar

tests/
├── BalanceProjectionApp.Domain.Tests/
├── BalanceProjectionApp.Application.Tests/
├── BalanceProjectionApp.Infrastructure.Tests/
└── BalanceProjectionApp.Api.Tests/
```

---

## Tech Stack

**Backend**
- **.NET 10** / ASP.NET Core Minimal API
- **Entity Framework Core 10** + SQLite
- **MediatR 12** (CQRS)
- **FluentValidation 11**

**Frontend**
- **React 19** + **Vite** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**
- **Recharts**

**Desktop**
- **Tauri 2** — a API .NET é bundled como sidecar; sem servidor externo necessário

---

## Desenvolvimento

### Pré-requisitos

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 22+](https://nodejs.org/)
- [Rust stable](https://rustup.rs/) — apenas para a app desktop

### API + Frontend web

```bash
# Iniciar a API (http://localhost:5535)
dotnet run --project src/BalanceProjectionApp.ApiService

# Iniciar o frontend (http://localhost:5173)
cd ui/web && npm install && npm run dev
```

A base de dados SQLite é criada automaticamente em `bin/.../data/balance_projection.db`.

### App desktop (Tauri)

```bash
# A API tem de estar a correr separadamente em dev
cd ui/desktop && npm install && npm run dev
```

### Docker (stack completa)

```bash
docker compose up --build
# API em http://localhost:5535
```

### Popular a base de dados

```bash
sqlite3 src/BalanceProjectionApp.ApiService/bin/Debug/net10.0/data/balance_projection.db < seed.sql
```

---

## Testes

Os testes de integração usam SQLite em ficheiro temporário — sem Docker necessário.

```bash
dotnet test tests/BalanceProjectionApp.Domain.Tests
dotnet test tests/BalanceProjectionApp.Application.Tests
dotnet test tests/BalanceProjectionApp.Infrastructure.Tests
dotnet test tests/BalanceProjectionApp.Api.Tests
```

| Projeto | Tipo | O que testa |
|---|---|---|
| `Domain.Tests` | Unitário | Entidades e regras de domínio |
| `Application.Tests` | Unitário (mocks) | Handlers CQRS com NSubstitute |
| `Infrastructure.Tests` | Integração | Repositórios EF Core contra SQLite (ficheiro temp) |
| `Api.Tests` | E2E | Endpoints HTTP via WebApplicationFactory + SQLite (ficheiro temp) |

---

## Migrações

```bash
dotnet ef migrations add NomeDaMigracao \
  --project src/BalanceProjectionApp.Infrastructure \
  --startup-project src/BalanceProjectionApp.ApiService
```

---

## Release do installer desktop

O workflow `.github/workflows/release.yml` automatiza o build e publicação ao fazer push de uma tag:

```bash
# Actualizar a versão em ui/desktop/src-tauri/tauri.conf.json, depois:
git tag v1.0.0
git push origin v1.0.0
```

O GitHub Actions (~10-15 min):
1. Publica a API como binário single-file win-x64
2. Compila e assina o installer NSIS
3. Cria o GitHub Release com o `.exe` e `latest.json` para auto-update

O installer está disponível em **Releases**. Os clientes com a app instalada recebem notificação de atualização automática.

---

## Conceitos de domínio

- **Parcela** — unidade central; apenas parcelas `IsPaid = true` afectam o saldo.
- **Comissão** — deduzida na criação da parcela via `Colaborador.Percentagem`: `ValorLiquido = ValorBruto × (1 − Percentagem / 100)`.
- **IVA** — ao criar uma `Receita` com `temIva: true`, é gerada automaticamente uma despesa pontual `"IVA de {nome}"` com 23% do valor, com vencimento no dia 20 do mês corrente.
- **Liquidar** — liquida uma parcela e credita/debita atomicamente a conta.
- **Financiamento** — credita a conta imediatamente e cria uma despesa fixa associada; o total pago nunca pode exceder `Financiamento.Valor`.

---

## API Endpoints

| Method | Path | Descrição |
|---|---|---|
| `GET/POST` | `/contas` | Listar / criar contas |
| `GET/DELETE` | `/contas/{id}` | Obter / eliminar conta |
| `GET/POST` | `/receitas` | Listar / criar receitas |
| `PUT/DELETE` | `/receitas/{id}` | Editar / eliminar receita |
| `GET/POST` | `/despesas` | Listar / criar despesas |
| `PUT/DELETE` | `/despesas/{id}` | Editar / eliminar despesa |
| `PATCH` | `/despesas/{id}/estado` | Activar / desactivar despesa fixa |
| `GET` | `/parcelas/conta/{contaId}` | Listar parcelas (`?apenasPendentes=true`) |
| `POST` | `/parcelas/{id}/liquidar` | Liquidar parcela |
| `POST` | `/parcelas/{id}/estornar` | Estornar parcela |
| `DELETE` | `/parcelas/{id}` | Eliminar parcela pendente |
| `GET/POST` | `/colaboradores` | Listar / criar colaboradores |
| `DELETE` | `/colaboradores/{id}` | Eliminar colaborador |
| `GET` | `/financiamentos/conta/{contaId}` | Listar financiamentos |
| `POST` | `/financiamentos` | Registar financiamento |
| `GET/POST/PUT/DELETE` | `/previsoes` | Gestão de previsões (modo simulação) |
