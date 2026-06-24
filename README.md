# BalanceProjectionApp

[![CI](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/build.yml/badge.svg)](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/build.yml)
[![Sonar](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/Sonar.yml/badge.svg)](https://github.com/TomasMartins50635/BalanceProjectionApp/actions/workflows/Sonar.yml)

**Gestão Tesouraria** é uma ferramenta de gestão financeira desenhada para empresas no mercado imobiliário. Permite controlar receitas, despesas, financiamentos e o saldo bancário real e previsto — com suporte a comissões de colaboradores, simulação de fluxo de caixa e instalador desktop com atualização automática.

O diferencial central é que o saldo é calculado **parcela a parcela**, nunca pelo valor total dos contratos. Apenas parcelas efetivamente liquidadas afetam o saldo da conta.

---

## Funcionalidades

- **Contas bancárias** — gestão de múltiplas contas com saldo em tempo real
- **Receitas e Despesas** — pontual, fixa ou recorrente; suporte a IVA automático (23%)
- **Parcelas** — liquidação individual com data de pagamento; estorno disponível
- **Colaboradores** — tipo Comercial (comissões de Venda e Angariação) ou Serviço; múltiplas comissões por receita com soma máxima de 100%
- **Estatísticas de colaborador** — totais recebidos e pendentes por período, breakdown por tipo de comissão, lista de receitas com parcelas
- **Financiamentos** — credita a conta imediatamente e cria despesa fixa associada com controlo do teto de pagamento
- **Simulação / Previsão** — projeção de saldo futuro com base em cadências e valores médios configuráveis
- **Sincronização remota** — servidor de sync opcional para partilha da base de dados entre dispositivos
- **App desktop** — installer Windows com a API .NET bundled; sem servidor externo necessário; auto-update integrado

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

## Sincronização remota (Sync Server)

O sync server permite partilhar a base de dados entre múltiplos dispositivos. É opcional — a app desktop funciona sem ele.

### Instalação no Windows Server

1. Vai à página de **[Releases](https://github.com/TomasMartins50635/BalanceProjectionApp/releases)** e descarrega `install.ps1`
2. Clique direito no ficheiro → **"Executar com PowerShell como Administrador"**
3. Segue as instruções — no final o script mostra a URL e a chave de API

O script trata de tudo automaticamente:
- Descarrega o binário do servidor
- Instala como serviço Windows (inicia automaticamente com o servidor)
- Abre o firewall na porta 5536
- Gera uma chave de API aleatória

### Configuração na app desktop

Após a instalação do servidor, abre a app desktop e vai a **Definições → Sincronização**:
- **URL:** `http://<ip-do-servidor>:5536`
- **Chave de API:** valor apresentado no final da instalação

### Gerir o serviço

```powershell
Start-Service GestaoTesouraria-Sync   # iniciar
Stop-Service  GestaoTesouraria-Sync   # parar
```

Os logs ficam no **Event Viewer → Windows Logs → Application**.

### Parâmetros avançados

```powershell
.\install.ps1 -ApiKey "chave-personalizada" -Port 5536 -InstallDir "D:\Sync"
```

---

## Release do installer desktop

O workflow `.github/workflows/release.yml` automatiza o build e publicação ao fazer push de uma tag:

```bash
# Actualizar a versão em ui/desktop/src-tauri/tauri.conf.json, depois:
git tag v0.2.0
git push origin v0.2.0
```

O GitHub Actions (~10-15 min):
1. Publica a API como binário single-file win-x64
2. Compila e assina o installer NSIS
3. Cria o GitHub Release com o `.exe` e `latest.json` para auto-update

O installer está disponível em **Releases**. Os clientes com a app instalada recebem notificação de atualização automática.

---

## API Endpoints

| Method | Path | Descrição |
|---|---|---|
| `GET/POST` | `/contas` | Listar / criar contas |
| `GET/DELETE` | `/contas/{id}` | Obter / eliminar conta |
| `GET/POST` | `/receitas` | Listar / criar receitas |
| `PUT/DELETE` | `/receitas/{id}` | Editar / eliminar receita |
| `POST` | `/receitas/{id}/comissoes` | Adicionar comissão a uma receita |
| `DELETE` | `/receitas/{id}/comissoes/{comissaoId}` | Remover comissão de uma receita |
| `GET/POST` | `/despesas` | Listar / criar despesas |
| `PUT/DELETE` | `/despesas/{id}` | Editar / eliminar despesa |
| `PATCH` | `/despesas/{id}/estado` | Activar / desactivar despesa fixa |
| `POST` | `/despesas/{id}/parcelas` | Adicionar parcela a despesa |
| `GET` | `/parcelas/conta/{contaId}` | Listar parcelas (`?apenasPendentes=true`) |
| `POST` | `/parcelas/{id}/liquidar` | Liquidar parcela |
| `POST` | `/parcelas/{id}/estornar` | Estornar parcela |
| `PATCH` | `/parcelas/{id}/conta` | Mover parcela para outra conta |
| `DELETE` | `/parcelas/{id}` | Eliminar parcela pendente |
| `GET/POST` | `/colaboradores` | Listar / criar colaboradores |
| `PUT` | `/colaboradores/{id}` | Atualizar colaborador |
| `DELETE` | `/colaboradores/{id}` | Eliminar colaborador |
| `GET` | `/colaboradores/{id}/estatisticas` | Estatísticas num período (`?inicio=&fim=`) |
| `GET` | `/financiamentos/conta/{contaId}` | Listar financiamentos |
| `POST` | `/financiamentos` | Registar financiamento |
| `DELETE` | `/financiamentos/{id}` | Eliminar financiamento |
| `GET/POST/PUT/DELETE` | `/previsoes` | Gestão de previsões (simulação) |
