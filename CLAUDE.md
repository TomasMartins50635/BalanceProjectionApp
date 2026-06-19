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

**Colaborador** — `Domain/Entities/Colaborador.cs`
Tem uma `Percentagem` de comissão. Quando associado a uma `Receita`, a sua percentagem é usada em `AdicionarParcela` para calcular o `ValorLiquido`. **Não existe entidade `Comissao` separada** — a percentagem é lida diretamente de `Colaborador.Percentagem`. O repositório deve sempre fazer `Include(r => r.Colaborador)` antes de adicionar parcelas; se `ColaboradorId` estiver definido mas `Colaborador` for null, `AdicionarParcela` lança `InvalidOperationException`.

**Financiamento** — `Domain/Entities/Financiamento.cs`
Capital externo. Ao ser criado credita imediatamente a Conta e cria automaticamente uma **Despesa Fixa ativa** associada (categoria `Financiamento`) com `ValorFixo` igual à mensalidade e com a **primeira parcela** criada.

### Regras de Negócio Invioláveis
1. **Nunca calcular saldo pelo total do contrato** — apenas parcelas com `IsPaid = true` afetam o saldo.
2. **Comissão deduzida no `AdicionarParcela`**, não na liquidação — `ValorLiquido = ValorBruto − (ValorBruto × Colaborador.Percentagem / 100)`. O `ValorLiquido` é fixo na criação.
3. **Liquidar uma parcela de Receita → `Conta.Creditar(ValorLiquido)`**; de Despesa → `Conta.Debitar(ValorLiquido)`.
4. **Relação One-to-Many** entre Receita/Despesa e Parcelas no modelo de dados.
5. **IVA**: ao criar uma Receita com `TemIva = true`, é gerada automaticamente uma Despesa Pontual com nome `"IVA de {nome}"`, categoria `IVA`, mesma conta, com uma parcela de valor `ValorTotal × 23%` com vencimento no dia 20 do mês corrente.
6. **Financiamento**: ao criar financiamento, a data é imediata (`DateOnly.FromDateTime(DateTime.UtcNow)`), é gerada uma Despesa Fixa ativa associada com mensalidade (`ValorFixo`) e a primeira parcela é criada automaticamente.
7. **Teto de financiamento**: a soma do valor pago nas parcelas de uma despesa associada a financiamento nunca pode ultrapassar `Financiamento.Valor`; quando aplicável, a próxima parcela é ajustada ao valor restante.

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
- **Migrações:** aplicadas automaticamente em todos os ambientes via `db.Database.MigrateAsync()` no `Program.cs` (fora do bloco `IsDevelopment`)
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
| `POST` | `/receitas` | Cria receita (com parcelas, colaborador opcional e flag `temIva`) |
| `GET` | `/despesas` | Lista despesas com parcelas |
| `POST` | `/despesas` | Cria despesa (com parcelas) |
| `GET` | `/parcelas/conta/{contaId}` | Lista parcelas da conta (query `?apenasPendentes=true`) |
| `POST` | `/parcelas/{id}/liquidar` | **Liquida parcela** — atualiza saldo da conta |
| `GET` | `/financiamentos/conta/{contaId}` | Lista financiamentos da conta |
| `POST` | `/financiamentos` | Regista financiamento (`nome`, `valor`, `contaId`, `valorMensalidade`) — data imediata, cria despesa fixa ativa associada e credita conta imediatamente |
| `GET` | `/health` | Health check (dev only) |
| `GET` | `/alive` | Liveness probe (dev only) |
| `GET` | `/openapi/v1.json` | OpenAPI schema (dev only) |

### Tratamento de erros
- `ValidationException` (FluentValidation) → `400 Bad Request`
- `DomainException` → `422 Unprocessable Entity`
- Outros → `500 Internal Server Error`

---

## Estrutura de UI

Os clientes frontend estão em `ui/`:

| Pasta | Descrição |
|---|---|
| `ui/web/` | React + Vite — app web (fonte de verdade para o código frontend) |
| `ui/desktop/` | Tauri wrapper — app desktop; aponta para `ui/web/` como frontend |

O código React vive **apenas** em `ui/web/`. O `ui/desktop/` contém apenas `src-tauri/` e o `package.json` do Tauri CLI.

```bash
# Correr app web
cd ui/web && npm run dev

# Correr app desktop (inicia automaticamente o dev server do web)
cd ui/desktop && npm run dev
```

---

## Running the Application

```bash
# Development — run everything (DB + API) in Docker
docker compose up --build

# Development — run only the DB, API locally
docker compose up db -d
dotnet run --project src/BalanceProjectionApp.ApiService
```

- Containerised API: `http://localhost:5535`
- Local API: HTTP `5535` / HTTPS `7329`

### Production (Windows Server)

**One-time server setup:**
1. Install Docker Desktop for Windows on the server
2. Clone this repo on the server
3. Open Windows Firewall — inbound TCP rule for port `5535`
4. Run: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`

**Update after code changes (run on the server):**
```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

**Build Tauri desktop installer (run on dev machine):**
```bash
# 1. Set the server IP in ui/web/.env.production:
#    VITE_API_BASE_URL=http://<SERVER_LAN_IP>:5535
# 2. Build:
cd ui/desktop && npm run build
# Installer output: ui/desktop/src-tauri/target/release/bundle/
```

---

## Convenções

- Target `net10.0` em todos os projetos
- `<Nullable>enable</Nullable>` e `<ImplicitUsings>enable</ImplicitUsings>` em todos os `.csproj`
- Toda a lógica de negócio fica no **Domain**; coordenação de use cases no **Application**; nada de lógica nos endpoints
- Novos endpoints vão em `ApiService/Controllers/{Entidade}Controller.cs`, herdam de `ControllerBase`, decorados com `[ApiController]` e `[Route("{entidade}")]`
- Novos use cases seguem a estrutura `Features/{Entidade}/Commands ou Queries/{Nome}/`

---

## Testing

Três camadas de testes, todos registados em `.slnx`:

| Projeto | Tipo | O que testa |
|---|---|---|
| `tests/BalanceProjectionApp.Domain.Tests` | Unidade | Entidades e regras de domínio |
| `tests/BalanceProjectionApp.Application.Tests` | Unidade (mocks) | Handlers CQRS, repositórios mockados com NSubstitute |
| `tests/BalanceProjectionApp.Infrastructure.Tests` | Integração | Repositórios EF Core contra PostgreSQL real via Testcontainers |
| `tests/BalanceProjectionApp.Api.Tests` | Integração (E2E) | Endpoints HTTP via WebApplicationFactory + Testcontainers |

### Executar todos os testes
```bash
dotnet test tests/BalanceProjectionApp.Domain.Tests
dotnet test tests/BalanceProjectionApp.Application.Tests
dotnet test tests/BalanceProjectionApp.Infrastructure.Tests   # requer Docker
dotnet test tests/BalanceProjectionApp.Api.Tests              # requer Docker
```

### Notas de implementação
- `xUnit`, `FluentAssertions`, `NSubstitute` (mocks), `Testcontainers.PostgreSql` (container PostgreSQL efémero)
- Os testes de integração usam `[Collection("Database")]` / `[Collection("Api")]` com fixture partilhada — um container por suite
- Cada classe de teste chama `ResetDatabaseAsync()` (TRUNCATE + CASCADE) em `IAsyncLifetime.InitializeAsync` para isolamento
- `WebApplicationFactory<Program>` liga-se ao container via override da connection string em `ConfigureWebHost`
- `Program.cs` expõe `public partial class Program { }` no fim do ficheiro para permitir o uso de `WebApplicationFactory<Program>` nos testes
- Não usar `xunit` implicitly — adicionar `using Xunit;` explicitamente nos ficheiros de teste
