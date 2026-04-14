# BalanceProjectionApp — CLAUDE.md

> Keep this file updated as the project evolves. Any time a new project is added, a major dependency changes, endpoints are added/removed, patterns shift, or architectural decisions are made, update the relevant section here.

---

## Domínio de Negócio

### Propósito
Sistema de gestão financeira focado no controlo de **saldo bancário real e previsto**, faturação e despesas. O diferencial central é que o saldo é calculado **parcela a parcela** — nunca pelo valor total dos contratos.

### Entidades Principais

**Conta** — `Domain/Entities/Conta.cs`
Armazena o saldo (atualizado atomicamente via `Creditar`/`Debitar` no mesmo SaveChanges que liquida a parcela).

**Receita / Despesa** — `Domain/Entities/Receita.cs`, `Despesa.cs`
Entidades independentes (sem herança EF Core). Agrupam nome, categoria e ContaId. O valor total é meramente informativo — o movimento financeiro ocorre nas parcelas.

**Parcela** — `Domain/Entities/Parcela.cs`
Core do sistema. Pertence a uma Receita **ou** Despesa (ReceitaId/DespesaId nullable). Tem `ContaId` denormalizado para evitar joins na liquidação. `Liquidar()` lança `DomainException` se `IsPaid` já for true.

**Comissao** — `Domain/Entities/Comissao.cs`
Configurada na Receita. Deduzida no cálculo do `ValorLiquido` quando `AdicionarParcela` é chamado:
> `ValorLiquido = ValorBruto − (ValorBruto × Percentagem / 100)`

**Financiamento** — `Domain/Entities/Financiamento.cs`
Capital externo. Ao ser criado credita imediatamente a Conta. Pode referenciar uma Despesa para rastreabilidade.

### Regras de Negócio Invioláveis
1. **Nunca calcular saldo pelo total do contrato** — apenas parcelas com `IsPaid = true` afetam o saldo.
2. **Comissão deduzida no `AdicionarParcela`**, não na liquidação (o `ValorLiquido` é fixo na criação).
3. **Liquidar uma parcela de Receita → `Conta.Creditar(ValorLiquido)`**; de Despesa → `Conta.Debitar(ValorLiquido)`.
4. **Relação One-to-Many** entre Receita/Despesa e Parcelas no modelo de dados.

---

## Arquitetura — Clean Architecture

### Camadas e regra de dependência

```
ApiService → Application → Domain
Infrastructure → Domain + Application
ApiService → Infrastructure  (apenas para registo DI em Program.cs)
```

### Projetos

| Projeto | Camada | Responsabilidade |
|---|---|---|
| `BalanceProjectionApp.Domain` | Domain | Entidades, exceções, interfaces de repositório |
| `BalanceProjectionApp.Application` | Application | CQRS (MediatR), validação (FluentValidation), DTOs |
| `BalanceProjectionApp.Infrastructure` | Infrastructure | EF Core (PostgreSQL), repositórios, UnitOfWork |
| `BalanceProjectionApp.ApiService` | Presentation | Minimal API endpoints, registo DI, middleware |

### Estrutura de ficheiros Application

```
Features/
  {Entidade}/
    Commands/{NomeCommand}/   NomeCommand.cs, Handler.cs, Validator.cs
    Queries/{NomeQuery}/      NomeQuery.cs, Handler.cs
    Dtos/                     EntityDto.cs
Common/
  Behaviours/                 ValidationBehaviour.cs  (MediatR pipeline)
  Interfaces/                 IUnitOfWork.cs
DependencyInjection.cs
```

### Pacotes chave

| Pacote | Projeto | Versão |
|---|---|---|
| `MediatR` | Application | 12.4.1 |
| `FluentValidation.DependencyInjectionExtensions` | Application | 11.11.0 |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | Infrastructure | 10.0.1 |
| `Microsoft.EntityFrameworkCore.Tools` | Infrastructure | 10.0.1 |
| `Microsoft.AspNetCore.OpenApi` | ApiService | 10.0.1 |

---

## Base de Dados

- **Provider:** PostgreSQL via `Npgsql.EntityFrameworkCore.PostgreSQL`
- **Dev setup:** `docker compose up -d` na raiz do repositório inicia um container Postgres 17 na porta 5432
- **Connection string:** `ConnectionStrings:DefaultConnection` em `appsettings.Development.json` (aponta para o container Docker)
- **Migrações:** aplicadas automaticamente em Development via `db.Database.MigrateAsync()` no `Program.cs`
- **Gerar migração:** `dotnet ef migrations add NomeDaMigracao --project src/BalanceProjectionApp.Infrastructure --startup-project src/BalanceProjectionApp.ApiService`

### Índices definidos em `ParcelaConfiguration`
- `ContaId` — queries de saldo
- `(ContaId, IsPaid)` — filtro de parcelas pendentes
- `DataVencimento` — ordenação e filtros por data

---

## API Endpoints (ApiService)

| Method | Path | Description |
|---|---|---|
| `GET` | `/contas` | Lista todas as contas |
| `GET` | `/contas/{id}` | Obtém conta com saldo atual |
| `POST` | `/contas` | Cria conta |
| `DELETE` | `/contas/{id}` | Elimina conta (falha se tiver receitas/despesas/financiamentos associados) |
| `GET` | `/receitas` | Lista receitas com parcelas |
| `POST` | `/receitas` | Cria receita (com parcelas e comissão opcional) |
| `GET` | `/despesas` | Lista despesas com parcelas |
| `POST` | `/despesas` | Cria despesa (com parcelas) |
| `GET` | `/parcelas/conta/{contaId}` | Lista parcelas da conta (query `?apenasPendentes=true`) |
| `POST` | `/parcelas/{id}/liquidar` | **Liquida parcela** — atualiza saldo da conta |
| `GET` | `/financiamentos/conta/{contaId}` | Lista financiamentos da conta |
| `POST` | `/financiamentos` | Regista financiamento — credita conta imediatamente |
| `GET` | `/health` | Health check (dev only) |
| `GET` | `/alive` | Liveness probe (dev only) |
| `GET` | `/openapi/v1.json` | OpenAPI schema (dev only) |

### Tratamento de erros
- `ValidationException` (FluentValidation) → `400 Bad Request`
- `DomainException` → `422 Unprocessable Entity`
- Outros → `500 Internal Server Error`

---

## Running the Application

```bash
# Run everything (DB + API) in Docker
docker compose up --build

# Or run only the DB and the API locally
docker compose up db -d
dotnet run --project src/BalanceProjectionApp.ApiService
```

- Containerised API: `http://localhost:5535`
- Local API: HTTP `5535` / HTTPS `7329`

---

## Convenções

- Target `net10.0` em todos os projetos
- `<Nullable>enable</Nullable>` e `<ImplicitUsings>enable</ImplicitUsings>` em todos os `.csproj`
- Toda a lógica de negócio fica no **Domain**; coordenação de use cases no **Application**; nada de lógica nos endpoints
- Novos endpoints vão em `ApiService/Controllers/{Entidade}Controller.cs`, herdam de `ControllerBase`, decorados com `[ApiController]` e `[Route("{entidade}")]`
- Novos use cases seguem a estrutura `Features/{Entidade}/Commands ou Queries/{Nome}/`

---

## Testing

Sem projetos de teste atualmente. Ao adicionar, criar xUnit com referência a `Application` e `Domain`, e registar no `.slnx`.
