# Financial Model Changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alterar receitas (parcelas por valor direto, categorias estáticas), despesas (remover Aluguer, proteger IVA/Financiamento, periodicidade em Recorrente) e financiamentos (prestação, periodicidade, data primeira parcela).

**Architecture:** Clean Architecture — Domain → Application → Infrastructure → API → UI. Alterações fluem de dentro para fora: enums e entidades primeiro, depois commands/handlers, depois EF config/migração, depois UI.

**Tech Stack:** .NET 10, EF Core + PostgreSQL, MediatR, FluentValidation, React + Vite + TypeScript, Tailwind, shadcn/ui.

---

## Ficheiros a tocar

**Domain**
- Create: `src/BalanceProjectionApp.Domain/Enums/CategoriaReceita.cs`
- Modify: `src/BalanceProjectionApp.Domain/Enums/CategoriaContrato.cs`
- Modify: `src/BalanceProjectionApp.Domain/Entities/Receita.cs`
- Modify: `src/BalanceProjectionApp.Domain/Entities/Despesa.cs`

**Application**
- Modify: `src/BalanceProjectionApp.Application/Features/Receitas/Commands/CriarReceita/CriarReceitaCommand.cs`
- Modify: `src/BalanceProjectionApp.Application/Features/Receitas/Commands/CriarReceita/CriarReceitaCommandHandler.cs`
- Modify: `src/BalanceProjectionApp.Application/Features/Receitas/Commands/CriarReceita/CriarReceitaCommandValidator.cs`
- Modify: `src/BalanceProjectionApp.Application/Features/Receitas/Commands/AtualizarReceita/AtualizarReceitaCommand.cs`
- Modify: `src/BalanceProjectionApp.Application/Features/Receitas/Commands/AtualizarReceita/AtualizarReceitaCommandHandler.cs`
- Modify: `src/BalanceProjectionApp.Application/Features/Receitas/Commands/AtualizarReceita/AtualizarReceitaCommandValidator.cs`
- Modify: `src/BalanceProjectionApp.Application/Features/Receitas/Dtos/ReceitaDto.cs`
- Modify: `src/BalanceProjectionApp.Application/Features/Receitas/Queries/ListarReceitas/ListarReceitasQueryHandler.cs`
- Modify: `src/BalanceProjectionApp.Application/Features/Despesas/Commands/CriarDespesa/CriarDespesaCommandValidator.cs`
- Modify: `src/BalanceProjectionApp.Application/Features/Despesas/Commands/AtualizarDespesa/AtualizarDespesaCommandHandler.cs`
- Modify: `src/BalanceProjectionApp.Application/Features/Financiamentos/Commands/CriarFinanciamento/CriarFinanciamentoCommand.cs`
- Modify: `src/BalanceProjectionApp.Application/Features/Financiamentos/Commands/CriarFinanciamento/CriarFinanciamentoCommandHandler.cs`
- Modify: `src/BalanceProjectionApp.Application/Features/Financiamentos/Commands/CriarFinanciamento/CriarFinanciamentoCommandValidator.cs`
- Modify: `src/BalanceProjectionApp.Application/Features/Financiamentos/Dtos/FinanciamentoDto.cs`
- Modify: `src/BalanceProjectionApp.Application/Features/Financiamentos/Queries/ListarFinanciamentos/ListarFinanciamentosQueryHandler.cs`

**Infrastructure**
- Modify: `src/BalanceProjectionApp.Infrastructure/Persistence/Configurations/ReceitaConfiguration.cs`
- Create: migration via `dotnet ef migrations add`

**Tests**
- Modify: `tests/BalanceProjectionApp.Domain.Tests/ReceitaTests.cs`
- Modify: `tests/BalanceProjectionApp.Domain.Tests/DespesaTests.cs`
- Modify: `tests/BalanceProjectionApp.Application.Tests/CriarReceitaHandlerTests.cs`
- Modify: `tests/BalanceProjectionApp.Application.Tests/CriarFinanciamentoHandlerTests.cs`

**UI**
- Modify: `ui/web/src/lib/types.ts`
- Modify: `ui/web/src/components/ReceitaView.tsx`
- Modify: `ui/web/src/components/DespesaView.tsx`
- Modify: `ui/web/src/components/FinanciamentoView.tsx`

---

## Task 1: Domain — CategoriaReceita enum + remover Aluguer

**Files:**
- Create: `src/BalanceProjectionApp.Domain/Enums/CategoriaReceita.cs`
- Modify: `src/BalanceProjectionApp.Domain/Enums/CategoriaContrato.cs`
- Modify: `tests/BalanceProjectionApp.Domain.Tests/DespesaTests.cs` (remove referência a Aluguer)

- [ ] **Step 1: Criar `CategoriaReceita.cs`**

```csharp
namespace BalanceProjectionApp.Domain.Enums;

public enum CategoriaReceita
{
    Vendas,
    Arrendamentos,
    Outros
}
```

- [ ] **Step 2: Remover `Aluguer` de `CategoriaContrato.cs`**

```csharp
namespace BalanceProjectionApp.Domain.Enums;

public enum CategoriaContrato
{
    Servicos,
    Produtos,
    Salarios,
    Impostos,
    IVA,
    Financiamento,
    Outro
}
```

- [ ] **Step 3: Atualizar `DespesaTests.cs` — remover referência a `Aluguer`**

No método `Criar_DadosValidos_RetornaDespesa`, mudar `CategoriaContrato.Aluguer` → `CategoriaContrato.Servicos`:

```csharp
[Fact]
public void Criar_DadosValidos_RetornaDespesa()
{
    var despesa = Despesa.Criar("Renda", ContaId, CategoriaContrato.Servicos);

    despesa.Nome.Should().Be("Renda");
    despesa.ContaId.Should().Be(ContaId);
    despesa.Categoria.Should().Be(CategoriaContrato.Servicos);
}
```

- [ ] **Step 4: Verificar compilação Domain**

```bash
dotnet build src/BalanceProjectionApp.Domain/BalanceProjectionApp.Domain.csproj
```

Expected: Build succeeded.

- [ ] **Step 5: Correr testes de domínio**

```bash
dotnet test tests/BalanceProjectionApp.Domain.Tests/BalanceProjectionApp.Domain.Tests.csproj
```

Expected: todos os testes passam (exceto os que dependem de `Receita` — Task 2 resolve).

---

## Task 2: Domain — Receita entity

**Files:**
- Modify: `src/BalanceProjectionApp.Domain/Entities/Receita.cs`
- Modify: `tests/BalanceProjectionApp.Domain.Tests/ReceitaTests.cs`

- [ ] **Step 1: Escrever testes actualizados para `Receita`**

Substituir o conteúdo de `tests/BalanceProjectionApp.Domain.Tests/ReceitaTests.cs`:

```csharp
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using FluentAssertions;
using Xunit;

namespace BalanceProjectionApp.Domain.Tests;

public class ReceitaTests
{
    private static readonly Guid ContaId = Guid.NewGuid();
    private static readonly DateOnly Vencimento = new(2026, 6, 1);

    [Fact]
    public void Criar_DadosValidos_RetornaReceita()
    {
        var receita = Receita.Criar("Projeto ABC", ContaId, CategoriaReceita.Vendas);

        receita.Nome.Should().Be("Projeto ABC");
        receita.ContaId.Should().Be(ContaId);
        receita.Categoria.Should().Be(CategoriaReceita.Vendas);
        receita.IsDeleted.Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Criar_NomeVazio_LancaDomainException(string nome)
    {
        var act = () => Receita.Criar(nome, ContaId);

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void Deletar_ReceitaAtiva_MarcaComoRemovida()
    {
        var receita = Receita.Criar("Projeto", ContaId);
        receita.Deletar();
        receita.IsDeleted.Should().BeTrue();
    }

    [Fact]
    public void Deletar_ReceitaJaRemovida_NaoLancaExcecao()
    {
        var receita = Receita.Criar("Projeto", ContaId);
        receita.Deletar();
        var act = () => receita.Deletar();
        act.Should().NotThrow();
    }

    [Fact]
    public void AdicionarParcela_SemComissao_ValorBrutoELiquidoIguais()
    {
        var receita = Receita.Criar("Projeto", ContaId);

        var parcela = receita.AdicionarParcela(1, Vencimento, 4_000m);

        parcela.ValorBruto.Should().Be(4_000m);
        parcela.ValorLiquido.Should().Be(4_000m);
        parcela.Percentagem.Should().BeNull();
    }

    [Fact]
    public void AdicionarParcela_ComComissao_ValorLiquidoDeduzido()
    {
        var receita = Receita.Criar("Projeto", ContaId);
        var colaborador = Colaborador.Criar("Ana", 10m);
        receita.AssociarColaborador(colaborador);

        var parcela = receita.AdicionarParcela(1, Vencimento, 10_000m);

        parcela.ValorBruto.Should().Be(10_000m);
        parcela.ValorLiquido.Should().Be(9_000m);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void AdicionarParcela_ValorInvalido_LancaDomainException(decimal valor)
    {
        var receita = Receita.Criar("Projeto", ContaId);
        var act = () => receita.AdicionarParcela(1, Vencimento, valor);
        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void AdicionarParcela_NumeroRepetido_LancaDomainException()
    {
        var receita = Receita.Criar("Projeto", ContaId);
        receita.AdicionarParcela(1, Vencimento, 1_000m);
        var act = () => receita.AdicionarParcela(1, Vencimento, 500m);
        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void RemoverParcelasNaoPagas_MantemLiquidadasRemoveRestantes()
    {
        var receita = Receita.Criar("Projeto", ContaId);
        receita.AdicionarParcela(1, Vencimento, 5_000m);
        receita.AdicionarParcela(2, Vencimento.AddMonths(1), 5_000m);
        receita.Parcelas.First(p => p.Numero == 1).Liquidar();

        var removidos = receita.RemoverParcelasNaoPagas();

        removidos.Should().HaveCount(1);
        receita.Parcelas.Count(p => !p.IsDeleted).Should().Be(1);
        receita.Parcelas.Single(p => !p.IsDeleted).Numero.Should().Be(1);
    }
}
```

- [ ] **Step 2: Correr testes — devem FALHAR** (Receita.Criar ainda tem ValorTotal)

```bash
dotnet test tests/BalanceProjectionApp.Domain.Tests/BalanceProjectionApp.Domain.Tests.csproj --filter "ReceitaTests"
```

Expected: falhas de compilação ou testes a falhar.

- [ ] **Step 3: Substituir `Receita.cs`**

```csharp
using BalanceProjectionApp.Domain.Common;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;

namespace BalanceProjectionApp.Domain.Entities;

public class Receita : Entity
{
    public string Nome { get; private set; } = string.Empty;
    public CategoriaReceita? Categoria { get; private set; }
    public Guid ContaId { get; private set; }
    public Conta Conta { get; private set; } = null!;
    public Guid? ColaboradorId { get; private set; }
    public Colaborador? Colaborador { get; private set; }

    private readonly List<Parcela> _parcelas = [];
    public IReadOnlyCollection<Parcela> Parcelas => _parcelas.AsReadOnly();

    private Receita() { }

    public static Receita Criar(string nome, Guid contaId, CategoriaReceita? categoria = null)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome da receita não pode ser vazio.");

        return new Receita { Nome = nome, ContaId = contaId, Categoria = categoria };
    }

    public void Atualizar(string nome, CategoriaReceita? categoria)
    {
        if (string.IsNullOrWhiteSpace(nome))
            throw new DomainException("O nome da receita não pode ser vazio.");

        Nome = nome;
        Categoria = categoria;
    }

    public void AssociarColaborador(Colaborador colaborador)
    {
        ColaboradorId = colaborador.Id;
        Colaborador = colaborador;
    }

    public void RemoverColaborador()
    {
        ColaboradorId = null;
        Colaborador = null;
    }

    public Parcela AdicionarParcela(int numero, DateOnly dataVencimento, decimal valor)
    {
        if (valor <= 0)
            throw new DomainException($"O valor da parcela {numero} deve ser positivo.");

        if (_parcelas.Any(p => p.Numero == numero && !p.IsDeleted))
            throw new DomainException($"Já existe uma parcela com o número {numero} nesta receita.");

        decimal valorComissao = 0m;
        if (ColaboradorId.HasValue)
        {
            if (Colaborador is null)
                throw new InvalidOperationException("Colaborador navigation property must be loaded before adding parcelas.");
            valorComissao = Math.Round(valor * Colaborador.Percentagem / 100m, 2);
        }
        var valorLiquido = valor - valorComissao;

        var parcela = Parcela.Criar(numero, dataVencimento, valor, valorLiquido, ContaId, Id, null);
        _parcelas.Add(parcela);
        return parcela;
    }

    public IReadOnlyList<Guid> RemoverParcelasNaoPagas()
    {
        var naoPagas = _parcelas.Where(p => !p.IsPaid && !p.IsDeleted).ToList();
        foreach (var p in naoPagas)
            p.Deletar();
        return naoPagas.Select(p => p.Id).ToList();
    }
}
```

- [ ] **Step 4: Correr testes de domínio**

```bash
dotnet test tests/BalanceProjectionApp.Domain.Tests/BalanceProjectionApp.Domain.Tests.csproj
```

Expected: ReceitaTests passam, DespesaTests passam.

---

## Task 3: Domain — Despesa: Recorrente requer periodicidade

**Files:**
- Modify: `src/BalanceProjectionApp.Domain/Entities/Despesa.cs`
- Modify: `tests/BalanceProjectionApp.Domain.Tests/DespesaTests.cs`

- [ ] **Step 1: Adicionar testes para Recorrente com periodicidade**

Adicionar ao fim de `DespesaTests.cs` (antes do `}`):

```csharp
[Fact]
public void Criar_Recorrente_SemPeriodicidade_LancaDomainException()
{
    var act = () => Despesa.Criar(
        "Água", ContaId,
        tipo: TipoDespesa.Recorrente,
        valorFixo: 50m,
        dataInicio: new DateOnly(2026, 6, 1));

    act.Should().Throw<DomainException>();
}

[Fact]
public void Criar_Recorrente_ComPeriodicidade_RetornaDespesa()
{
    var despesa = Despesa.Criar(
        "Água", ContaId,
        tipo: TipoDespesa.Recorrente,
        valorFixo: 50m,
        periodicidade: Periodicidade.Mensal,
        dataInicio: new DateOnly(2026, 6, 1));

    despesa.Periodicidade.Should().Be(Periodicidade.Mensal);
    despesa.ValorFixo.Should().Be(50m);
}

[Fact]
public void GerarProximaParcela_Recorrente_UsaPeriodicidade()
{
    var despesa = Despesa.Criar(
        "Água", ContaId,
        tipo: TipoDespesa.Recorrente,
        valorFixo: 50m,
        periodicidade: Periodicidade.Trimestral,
        dataInicio: new DateOnly(2026, 1, 1));
    despesa.GerarProximaParcela();

    var segunda = despesa.GerarProximaParcela();

    segunda.DataVencimento.Should().Be(new DateOnly(2026, 4, 1));
}
```

Também atualizar o teste `Criar_Recorrente_ComValorPrevisto_RetornaDespesaComParcelaInicial` para passar `periodicidade`:

```csharp
[Fact]
public void Criar_Recorrente_ComValorPrevisto_RetornaDespesaComParcelaInicial()
{
    var despesa = Despesa.Criar(
        "Assinatura", ContaId,
        tipo: TipoDespesa.Recorrente,
        valorFixo: 125.50m,
        periodicidade: Periodicidade.Mensal,
        dataInicio: new DateOnly(2026, 6, 1));

    despesa.ValorFixo.Should().Be(125.50m);
    despesa.DataInicio.Should().Be(new DateOnly(2026, 6, 1));

    var parcela = despesa.GerarProximaParcela();

    parcela.ValorBruto.Should().Be(125.50m);
    parcela.ValorLiquido.Should().Be(125.50m);
}

[Fact]
public void Criar_Recorrente_SemValorPrevisto_LancaDomainException()
{
    var act = () => Despesa.Criar(
        "Assinatura", ContaId,
        tipo: TipoDespesa.Recorrente,
        periodicidade: Periodicidade.Mensal,
        dataInicio: new DateOnly(2026, 6, 1));

    act.Should().Throw<DomainException>();
}
```

- [ ] **Step 2: Correr testes — devem FALHAR**

```bash
dotnet test tests/BalanceProjectionApp.Domain.Tests/BalanceProjectionApp.Domain.Tests.csproj --filter "DespesaTests"
```

Expected: `Criar_Recorrente_SemPeriodicidade_LancaDomainException` e `GerarProximaParcela_Recorrente_UsaPeriodicidade` falham.

- [ ] **Step 3: Atualizar `Despesa.cs` — Recorrente requer periodicidade e usa-a em GerarProximaParcela**

No método `Criar`, alterar o bloco que valida periodicidade:

```csharp
if (tipo == TipoDespesa.Fixa || tipo == TipoDespesa.Recorrente)
{
    if (periodicidade is null)
        throw new DomainException($"Despesa {tipo} requer uma periodicidade.");
}
```

(Remover o bloco `if (tipo == TipoDespesa.Fixa && periodicidade is null)` existente e substituir pelo acima.)

No método `GerarProximaParcela`, substituir o bloco `else // Recorrente`:

```csharp
else // Recorrente
{
    var meses = Periodicidade switch
    {
        Enums.Periodicidade.Mensal     => 1,
        Enums.Periodicidade.Trimestral => 3,
        Enums.Periodicidade.Semestral  => 6,
        Enums.Periodicidade.Anual      => 12,
        _ => throw new DomainException("Periodicidade inválida.")
    };
    dataVencimento = ultimaData.AddMonths(meses);
}
```

- [ ] **Step 4: Correr testes de domínio**

```bash
dotnet test tests/BalanceProjectionApp.Domain.Tests/BalanceProjectionApp.Domain.Tests.csproj
```

Expected: todos passam.

---

## Task 4: Application — CriarReceita (command, validator, handler, DTO, query)

**Files:**
- Modify: `src/.../Features/Receitas/Commands/CriarReceita/CriarReceitaCommand.cs`
- Modify: `src/.../Features/Receitas/Commands/CriarReceita/CriarReceitaCommandValidator.cs`
- Modify: `src/.../Features/Receitas/Commands/CriarReceita/CriarReceitaCommandHandler.cs`
- Modify: `src/.../Features/Receitas/Dtos/ReceitaDto.cs`
- Modify: `src/.../Features/Receitas/Queries/ListarReceitas/ListarReceitasQueryHandler.cs`
- Modify: `tests/.../CriarReceitaHandlerTests.cs`

- [ ] **Step 1: Atualizar testes em `CriarReceitaHandlerTests.cs`**

Substituir o conteúdo completo:

```csharp
using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class CriarReceitaHandlerTests
{
    private readonly IReceitaRepository _receitaRepo = Substitute.For<IReceitaRepository>();
    private readonly IContaRepository _contaRepo = Substitute.For<IContaRepository>();
    private readonly IColaboradorRepository _colaboradorRepo = Substitute.For<IColaboradorRepository>();
    private readonly IDespesaRepository _despesaRepo = Substitute.For<IDespesaRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly CriarReceitaCommandHandler _handler;

    private static readonly Guid ContaId = Guid.NewGuid();
    private static readonly DateOnly Vencimento = new(2026, 6, 1);

    public CriarReceitaHandlerTests()
    {
        _handler = new CriarReceitaCommandHandler(_receitaRepo, _contaRepo, _colaboradorRepo, _despesaRepo, _uow);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>())
            .Returns(Conta.Criar("Conta", 0m));
    }

    [Fact]
    public async Task Handle_DadosValidos_AdicionaReceitaERetornaId()
    {
        var command = new CriarReceitaCommand("Proj ABC", ContaId, null, null,
            [new(1, Vencimento, 5_000m)]);

        var id = await _handler.Handle(command, CancellationToken.None);

        id.Should().NotBeEmpty();
        await _receitaRepo.Received(1).AdicionarAsync(Arg.Any<Receita>(), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ContaNaoExiste_LancaEntityNotFoundException()
    {
        _contaRepo.ObterPorIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((Conta?)null);

        var act = async () => await _handler.Handle(
            new CriarReceitaCommand("Proj", Guid.NewGuid(), null, null, [new(1, Vencimento, 1_000m)]),
            CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
        await _receitaRepo.DidNotReceive().AdicionarAsync(Arg.Any<Receita>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ComColaborador_AssociaColaboradorNaReceita()
    {
        var colaboradorId = Guid.NewGuid();
        var colaborador = Colaborador.Criar("Ana", 10m);
        _colaboradorRepo.ObterPorIdAsync(colaboradorId, Arg.Any<CancellationToken>())
            .Returns(colaborador);

        Receita? receitaCriada = null;
        await _receitaRepo.AdicionarAsync(Arg.Do<Receita>(r => receitaCriada = r), Arg.Any<CancellationToken>());

        await _handler.Handle(
            new CriarReceitaCommand("Proj", ContaId, null, colaboradorId, [new(1, Vencimento, 10_000m)]),
            CancellationToken.None);

        receitaCriada!.Colaborador!.Percentagem.Should().Be(10m);
    }

    [Fact]
    public async Task Handle_ColaboradorNaoExiste_LancaEntityNotFoundException()
    {
        var colaboradorId = Guid.NewGuid();
        _colaboradorRepo.ObterPorIdAsync(colaboradorId, Arg.Any<CancellationToken>())
            .Returns((Colaborador?)null);

        var act = async () => await _handler.Handle(
            new CriarReceitaCommand("Proj", ContaId, null, colaboradorId, [new(1, Vencimento, 5_000m)]),
            CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
    }

    [Fact]
    public async Task Handle_MultiplasParcelas_AdicionaTodasNaOrdemCorreta()
    {
        Receita? receitaCriada = null;
        await _receitaRepo.AdicionarAsync(Arg.Do<Receita>(r => receitaCriada = r), Arg.Any<CancellationToken>());

        await _handler.Handle(
            new CriarReceitaCommand("Proj", ContaId, null, null,
            [
                new(2, Vencimento.AddMonths(1), 6_000m),
                new(1, Vencimento, 4_000m),
            ]),
            CancellationToken.None);

        receitaCriada!.Parcelas.Should().HaveCount(2);
        receitaCriada.Parcelas.Select(p => p.Numero).Should().BeEquivalentTo([1, 2]);
    }

    [Fact]
    public async Task Handle_TemIvaUmaParcela_CriaUmaDespesaIvaComParcelaCorreta()
    {
        Despesa? despesaIva = null;
        await _despesaRepo.AdicionarAsync(Arg.Do<Despesa>(d => despesaIva = d), Arg.Any<CancellationToken>());

        await _handler.Handle(
            new CriarReceitaCommand("Proj", ContaId, null, null,
                [new(1, new DateOnly(2026, 5, 10), 1_000m)], TemIva: true),
            CancellationToken.None);

        despesaIva.Should().NotBeNull();
        despesaIva!.Categoria.Should().Be(CategoriaContrato.IVA);
        despesaIva.Parcelas.Should().HaveCount(1);
        despesaIva.Parcelas.Single().ValorBruto.Should().Be(230m);
        despesaIva.Parcelas.Single().DataVencimento.Should().Be(new DateOnly(2026, 5, 25));
    }

    [Fact]
    public async Task Handle_TemIva_ParcelaDia25_VencimentoNoMesSeguinte()
    {
        Despesa? despesaIva = null;
        await _despesaRepo.AdicionarAsync(Arg.Do<Despesa>(d => despesaIva = d), Arg.Any<CancellationToken>());

        await _handler.Handle(
            new CriarReceitaCommand("Proj", ContaId, null, null,
                [new(1, new DateOnly(2026, 5, 25), 1_000m)], TemIva: true),
            CancellationToken.None);

        despesaIva!.Parcelas.Single().DataVencimento.Should().Be(new DateOnly(2026, 6, 25));
    }

    [Fact]
    public async Task Handle_TemIvaMultiplasParcelas_CriaParcelaIvaPorCadaParcela()
    {
        Despesa? despesaIva = null;
        await _despesaRepo.AdicionarAsync(Arg.Do<Despesa>(d => despesaIva = d), Arg.Any<CancellationToken>());

        await _handler.Handle(
            new CriarReceitaCommand("Proj", ContaId, null, null,
            [
                new(1, new DateOnly(2026, 5, 10), 1_000m),
                new(2, new DateOnly(2026, 6, 10), 2_000m),
            ], TemIva: true),
            CancellationToken.None);

        despesaIva!.Parcelas.Should().HaveCount(2);
        despesaIva.Parcelas.Sum(p => p.ValorBruto).Should().Be(690m);
    }
}
```

- [ ] **Step 2: Atualizar `CriarReceitaCommand.cs`**

```csharp
using BalanceProjectionApp.Domain.Enums;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;

public record CriarReceitaCommand(
    string Nome,
    Guid ContaId,
    CategoriaReceita? Categoria,
    Guid? ColaboradorId,
    IEnumerable<CriarParcelaDto> Parcelas,
    bool TemIva = false) : IRequest<Guid>;

public record CriarParcelaDto(int Numero, DateOnly DataVencimento, decimal Valor);
```

- [ ] **Step 3: Atualizar `CriarReceitaCommandValidator.cs`**

```csharp
using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;

public class CriarReceitaCommandValidator : AbstractValidator<CriarReceitaCommand>
{
    public CriarReceitaCommandValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ContaId).NotEmpty();
        RuleFor(x => x.Parcelas).NotEmpty().WithMessage("A receita deve ter pelo menos uma parcela.");
        RuleForEach(x => x.Parcelas).ChildRules(p =>
        {
            p.RuleFor(x => x.Numero).GreaterThan(0);
            p.RuleFor(x => x.Valor).GreaterThan(0);
        });
    }
}
```

- [ ] **Step 4: Atualizar `CriarReceitaCommandHandler.cs`**

```csharp
using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.CriarReceita;

public class CriarReceitaCommandHandler(
    IReceitaRepository receitaRepository,
    IContaRepository contaRepository,
    IColaboradorRepository colaboradorRepository,
    IDespesaRepository despesaRepository,
    IUnitOfWork uow) : IRequestHandler<CriarReceitaCommand, Guid>
{
    public async Task<Guid> Handle(CriarReceitaCommand request, CancellationToken cancellationToken)
    {
        var conta = await contaRepository.ObterPorIdAsync(request.ContaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Conta), request.ContaId);

        var receita = Receita.Criar(request.Nome, conta.Id, request.Categoria);

        if (request.ColaboradorId.HasValue)
        {
            var colaborador = await colaboradorRepository.ObterPorIdAsync(request.ColaboradorId.Value, cancellationToken)
                ?? throw new EntityNotFoundException(nameof(Colaborador), request.ColaboradorId.Value);
            receita.AssociarColaborador(colaborador);
        }

        foreach (var p in request.Parcelas.OrderBy(p => p.Numero))
            receita.AdicionarParcela(p.Numero, p.DataVencimento, p.Valor);

        await receitaRepository.AdicionarAsync(receita, cancellationToken);

        if (request.TemIva)
        {
            var despesaIva = Despesa.Criar(
                $"IVA de {request.Nome}",
                conta.Id,
                CategoriaContrato.IVA,
                TipoDespesa.Pontual);

            var numeroParcela = 1;
            foreach (var p in request.Parcelas.OrderBy(x => x.Numero))
            {
                var valorIva = Math.Round(p.Valor * 0.23m, 2);
                var vencimentoIva = p.DataVencimento.Day < 25
                    ? new DateOnly(p.DataVencimento.Year, p.DataVencimento.Month, 25)
                    : new DateOnly(p.DataVencimento.Year, p.DataVencimento.Month, 25).AddMonths(1);
                despesaIva.AdicionarParcela(numeroParcela++, vencimentoIva, valorIva);
            }

            await despesaRepository.AdicionarAsync(despesaIva, cancellationToken);
        }

        await uow.SaveChangesAsync(cancellationToken);
        return receita.Id;
    }
}
```

- [ ] **Step 5: Atualizar `ReceitaDto.cs`**

```csharp
using BalanceProjectionApp.Application.Features.Parcelas.Dtos;
using BalanceProjectionApp.Domain.Enums;

namespace BalanceProjectionApp.Application.Features.Receitas.Dtos;

public record ReceitaDto(
    Guid Id,
    string Nome,
    CategoriaReceita? Categoria,
    Guid ContaId,
    decimal ValorTotal,
    Guid? ColaboradorId,
    string? ColaboradorNome,
    decimal? PercentagemComissao,
    DateTime UpdatedAt,
    IEnumerable<ParcelaDto> Parcelas);
```

- [ ] **Step 6: Atualizar `ListarReceitasQueryHandler.cs`**

```csharp
using BalanceProjectionApp.Application.Features.Parcelas.Dtos;
using BalanceProjectionApp.Application.Features.Receitas.Dtos;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Queries.ListarReceitas;

public class ListarReceitasQueryHandler(IReceitaRepository repository)
    : IRequestHandler<ListarReceitasQuery, IEnumerable<ReceitaDto>>
{
    public async Task<IEnumerable<ReceitaDto>> Handle(ListarReceitasQuery request, CancellationToken cancellationToken)
    {
        var receitas = await repository.ListarAsync(cancellationToken);
        return receitas.Select(r => new ReceitaDto(
            r.Id,
            r.Nome,
            r.Categoria,
            r.ContaId,
            r.Parcelas.Where(p => !p.IsDeleted).Sum(p => p.ValorBruto),
            r.ColaboradorId,
            r.Colaborador?.Nome,
            r.Colaborador?.Percentagem,
            r.UpdatedAt,
            r.Parcelas.Select(p => new ParcelaDto(
                p.Id, p.Numero, p.DataVencimento,
                p.ValorBruto, p.ValorLiquido,
                p.IsPaid, p.DataPagamento.HasValue ? DateOnly.FromDateTime(p.DataPagamento.Value) : null,
                p.ReceitaId, p.DespesaId, p.ContaId, p.Percentagem, r.Nome))));
    }
}
```

- [ ] **Step 7: Correr testes de Application**

```bash
dotnet test tests/BalanceProjectionApp.Application.Tests/BalanceProjectionApp.Application.Tests.csproj --filter "CriarReceitaHandlerTests"
```

Expected: todos passam.

---

## Task 5: Application — AtualizarReceita

**Files:**
- Modify: `src/.../Features/Receitas/Commands/AtualizarReceita/AtualizarReceitaCommand.cs`
- Modify: `src/.../Features/Receitas/Commands/AtualizarReceita/AtualizarReceitaCommandHandler.cs`
- Modify: `src/.../Features/Receitas/Commands/AtualizarReceita/AtualizarReceitaCommandValidator.cs`

- [ ] **Step 1: Atualizar `AtualizarReceitaCommand.cs`**

```csharp
using BalanceProjectionApp.Domain.Enums;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.AtualizarReceita;

public record AtualizarReceitaCommand(
    Guid Id,
    string Nome,
    CategoriaReceita? Categoria,
    Guid? ColaboradorId,
    IEnumerable<AtualizarParcelaDto> Parcelas) : IRequest;

public record AtualizarParcelaDto(int Numero, DateOnly DataVencimento, decimal Valor);
```

- [ ] **Step 2: Atualizar `AtualizarReceitaCommandHandler.cs`**

```csharp
using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.AtualizarReceita;

public class AtualizarReceitaCommandHandler(
    IReceitaRepository receitaRepository,
    IColaboradorRepository colaboradorRepository,
    IUnitOfWork uow) : IRequestHandler<AtualizarReceitaCommand>
{
    public async Task Handle(AtualizarReceitaCommand request, CancellationToken cancellationToken)
    {
        var receita = await receitaRepository.ObterPorIdComParcelasAsync(request.Id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Receita), request.Id);

        receita.Atualizar(request.Nome, request.Categoria);

        if (request.ColaboradorId != receita.ColaboradorId)
        {
            if (request.ColaboradorId.HasValue)
            {
                var colaborador = await colaboradorRepository.ObterPorIdAsync(request.ColaboradorId.Value, cancellationToken)
                    ?? throw new EntityNotFoundException(nameof(Colaborador), request.ColaboradorId.Value);
                receita.AssociarColaborador(colaborador);
            }
            else
            {
                receita.RemoverColaborador();
            }
        }

        receita.RemoverParcelasNaoPagas();

        foreach (var p in request.Parcelas.OrderBy(p => p.Numero))
            receita.AdicionarParcela(p.Numero, p.DataVencimento, p.Valor);

        await uow.SaveChangesAsync(cancellationToken);
    }
}
```

- [ ] **Step 3: Atualizar `AtualizarReceitaCommandValidator.cs`**

```csharp
using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Receitas.Commands.AtualizarReceita;

public class AtualizarReceitaCommandValidator : AbstractValidator<AtualizarReceitaCommand>
{
    public AtualizarReceitaCommandValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Parcelas).NotEmpty().WithMessage("A receita deve ter pelo menos uma parcela.");
        RuleForEach(x => x.Parcelas).ChildRules(p =>
        {
            p.RuleFor(x => x.Numero).GreaterThan(0);
            p.RuleFor(x => x.Valor).GreaterThan(0);
        });
    }
}
```

- [ ] **Step 4: Verificar compilação Application**

```bash
dotnet build src/BalanceProjectionApp.Application/BalanceProjectionApp.Application.csproj
```

Expected: Build succeeded.

---

## Task 6: Application — Despesas: guards IVA/Financiamento + Recorrente periodicidade

**Files:**
- Modify: `src/.../Features/Despesas/Commands/CriarDespesa/CriarDespesaCommandValidator.cs`
- Modify: `src/.../Features/Despesas/Commands/AtualizarDespesa/AtualizarDespesaCommandHandler.cs`

- [ ] **Step 1: Atualizar `CriarDespesaCommandValidator.cs`**

```csharp
using BalanceProjectionApp.Domain.Enums;
using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.CriarDespesa;

public class CriarDespesaCommandValidator : AbstractValidator<CriarDespesaCommand>
{
    public CriarDespesaCommandValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ContaId).NotEmpty();

        RuleFor(x => x.Categoria)
            .Must(c => c != CategoriaContrato.IVA && c != CategoriaContrato.Financiamento)
            .When(x => x.Categoria.HasValue)
            .WithMessage("Não é possível criar manualmente despesas de IVA ou Financiamento.");

        When(x => x.TipoDespesa != TipoDespesa.Pontual, () =>
        {
            RuleFor(x => x.ValorFixo).NotNull().GreaterThan(0)
                .WithMessage("Despesa fixa ou recorrente requer um valor positivo.");
            RuleFor(x => x.DataInicio).NotNull()
                .WithMessage("Despesa fixa ou recorrente requer uma data de início.");
        });

        When(x => x.TipoDespesa == TipoDespesa.Fixa || x.TipoDespesa == TipoDespesa.Recorrente, () =>
        {
            RuleFor(x => x.Periodicidade).NotNull()
                .WithMessage("Despesa fixa ou recorrente requer uma periodicidade.");
        });

        When(x => x.TipoDespesa == TipoDespesa.Pontual, () =>
        {
            RuleFor(x => x.Parcelas).NotEmpty()
                .WithMessage("A despesa pontual deve ter pelo menos uma parcela.");
            RuleForEach(x => x.Parcelas).ChildRules(p =>
            {
                p.RuleFor(x => x.Numero).GreaterThan(0);
                p.RuleFor(x => x.ValorBruto).GreaterThan(0);
            });
        });
    }
}
```

- [ ] **Step 2: Atualizar `AtualizarDespesaCommandHandler.cs`**

Alterar o guard de categoria para incluir Financiamento:

```csharp
if (despesa.Categoria == CategoriaContrato.IVA || despesa.Categoria == CategoriaContrato.Financiamento)
    throw new DomainException("Despesas de IVA e Financiamento não podem ser editadas.");
```

O ficheiro completo:

```csharp
using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Despesas.Commands.AtualizarDespesa;

public class AtualizarDespesaCommandHandler(
    IDespesaRepository despesaRepository,
    IUnitOfWork uow) : IRequestHandler<AtualizarDespesaCommand>
{
    public async Task Handle(AtualizarDespesaCommand request, CancellationToken cancellationToken)
    {
        var despesa = await despesaRepository.ObterPorIdComParcelasAsync(request.Id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Despesa), request.Id);

        if (despesa.Categoria == CategoriaContrato.IVA || despesa.Categoria == CategoriaContrato.Financiamento)
            throw new DomainException("Despesas de IVA e Financiamento não podem ser editadas.");

        despesa.Atualizar(request.Nome, request.Categoria);

        await uow.SaveChangesAsync(cancellationToken);
    }
}
```

- [ ] **Step 3: Verificar compilação**

```bash
dotnet build src/BalanceProjectionApp.Application/BalanceProjectionApp.Application.csproj
```

Expected: Build succeeded.

---

## Task 7: Application — CriarFinanciamento

**Files:**
- Modify: `src/.../Features/Financiamentos/Commands/CriarFinanciamento/CriarFinanciamentoCommand.cs`
- Modify: `src/.../Features/Financiamentos/Commands/CriarFinanciamento/CriarFinanciamentoCommandHandler.cs`
- Modify: `src/.../Features/Financiamentos/Commands/CriarFinanciamento/CriarFinanciamentoCommandValidator.cs`
- Modify: `src/.../Features/Financiamentos/Dtos/FinanciamentoDto.cs`
- Modify: `src/.../Features/Financiamentos/Queries/ListarFinanciamentos/ListarFinanciamentosQueryHandler.cs`
- Modify: `tests/.../CriarFinanciamentoHandlerTests.cs`

- [ ] **Step 1: Atualizar testes em `CriarFinanciamentoHandlerTests.cs`**

```csharp
using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Application.Features.Financiamentos.Commands.CriarFinanciamento;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace BalanceProjectionApp.Application.Tests;

public class CriarFinanciamentoHandlerTests
{
    private readonly IFinanciamentoRepository _financiamentoRepo = Substitute.For<IFinanciamentoRepository>();
    private readonly IDespesaRepository _despesaRepo = Substitute.For<IDespesaRepository>();
    private readonly IContaRepository _contaRepo = Substitute.For<IContaRepository>();
    private readonly IUnitOfWork _uow = Substitute.For<IUnitOfWork>();
    private readonly CriarFinanciamentoCommandHandler _handler;

    private static readonly Guid ContaId = Guid.NewGuid();
    private static readonly DateOnly PrimeiraParcela = new(2026, 6, 1);

    public CriarFinanciamentoHandlerTests()
    {
        _handler = new CriarFinanciamentoCommandHandler(_financiamentoRepo, _despesaRepo, _contaRepo, _uow);
    }

    private CriarFinanciamentoCommand CmdPadrao(decimal valor = 5_000m, decimal prestacao = 500m,
        Periodicidade periodicidade = Periodicidade.Mensal)
        => new("Empréstimo", valor, ContaId, prestacao, periodicidade, PrimeiraParcela);

    [Fact]
    public async Task Handle_DadosValidos_CreditaContaImediatamente()
    {
        var conta = Conta.Criar("Conta", 0m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        await _handler.Handle(CmdPadrao(), CancellationToken.None);

        conta.Saldo.Should().Be(5_000m);
    }

    [Fact]
    public async Task Handle_DadosValidos_AdicionaFinanciamentoERetornaId()
    {
        var conta = Conta.Criar("Conta", 0m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        var id = await _handler.Handle(CmdPadrao(), CancellationToken.None);

        id.Should().NotBeEmpty();
        await _despesaRepo.Received(1).AdicionarAsync(Arg.Any<Despesa>(), Arg.Any<CancellationToken>());
        await _financiamentoRepo.Received(1).AdicionarAsync(Arg.Any<Financiamento>(), Arg.Any<CancellationToken>());
        await _uow.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_DadosValidos_CriaDespesaFixaComPeriodicidadeEDataCorretas()
    {
        var conta = Conta.Criar("Conta", 0m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        await _handler.Handle(
            new CriarFinanciamentoCommand("Notebook", 5_000m, ContaId, 420m, Periodicidade.Trimestral, PrimeiraParcela),
            CancellationToken.None);

        await _despesaRepo.Received(1).AdicionarAsync(
            Arg.Is<Despesa>(d =>
                d.Nome == "Notebook"
                && d.TipoDespesa == TipoDespesa.Fixa
                && d.Categoria == CategoriaContrato.Financiamento
                && d.ValorFixo == 420m
                && d.Periodicidade == Periodicidade.Trimestral
                && d.DataInicio == PrimeiraParcela
                && d.IsActive
                && d.Parcelas.Count == 1
                && d.Parcelas.Single().DataVencimento == PrimeiraParcela),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_PrestacaoMaiorQueFinanciamento_LancaDomainException()
    {
        var conta = Conta.Criar("Conta", 0m);
        _contaRepo.ObterPorIdAsync(ContaId, Arg.Any<CancellationToken>()).Returns(conta);

        var act = async () => await _handler.Handle(
            new CriarFinanciamentoCommand("Notebook", 300m, ContaId, 420m, Periodicidade.Mensal, PrimeiraParcela),
            CancellationToken.None);

        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("*prestação não pode ultrapassar o valor do financiamento*");
        await _despesaRepo.DidNotReceive().AdicionarAsync(Arg.Any<Despesa>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ContaNaoExiste_LancaEntityNotFoundException()
    {
        _contaRepo.ObterPorIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Conta?)null);

        var act = async () => await _handler.Handle(
            new CriarFinanciamentoCommand("Empréstimo", 1_000m, Guid.NewGuid(), 100m, Periodicidade.Mensal, PrimeiraParcela),
            CancellationToken.None);

        await act.Should().ThrowAsync<EntityNotFoundException>();
    }
}
```

- [ ] **Step 2: Atualizar `CriarFinanciamentoCommand.cs`**

```csharp
using BalanceProjectionApp.Domain.Enums;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Commands.CriarFinanciamento;

public record CriarFinanciamentoCommand(
    string Nome,
    decimal Valor,
    Guid ContaId,
    decimal ValorPrestacao,
    Periodicidade Periodicidade,
    DateOnly DataPrimeiraParcela) : IRequest<Guid>;
```

- [ ] **Step 3: Atualizar `CriarFinanciamentoCommandHandler.cs`**

```csharp
using BalanceProjectionApp.Application.Common.Interfaces;
using BalanceProjectionApp.Domain.Entities;
using BalanceProjectionApp.Domain.Enums;
using BalanceProjectionApp.Domain.Exceptions;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Commands.CriarFinanciamento;

public class CriarFinanciamentoCommandHandler(
    IFinanciamentoRepository financiamentoRepository,
    IDespesaRepository despesaRepository,
    IContaRepository contaRepository,
    IUnitOfWork uow) : IRequestHandler<CriarFinanciamentoCommand, Guid>
{
    public async Task<Guid> Handle(CriarFinanciamentoCommand request, CancellationToken cancellationToken)
    {
        var conta = await contaRepository.ObterPorIdAsync(request.ContaId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Conta), request.ContaId);

        if (request.ValorPrestacao > request.Valor)
            throw new DomainException("A prestação não pode ultrapassar o valor do financiamento.");

        var despesa = Despesa.Criar(
            request.Nome,
            conta.Id,
            CategoriaContrato.Financiamento,
            TipoDespesa.Fixa,
            request.ValorPrestacao,
            request.Periodicidade,
            request.DataPrimeiraParcela);

        despesa.GerarProximaParcela();

        var financiamento = Financiamento.Criar(
            request.Nome, request.Valor,
            DateOnly.FromDateTime(DateTime.UtcNow),
            conta.Id, despesa.Id);

        conta.Creditar(request.Valor);

        await despesaRepository.AdicionarAsync(despesa, cancellationToken);
        await financiamentoRepository.AdicionarAsync(financiamento, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return financiamento.Id;
    }
}
```

- [ ] **Step 4: Atualizar `CriarFinanciamentoCommandValidator.cs`**

```csharp
using BalanceProjectionApp.Domain.Enums;
using FluentValidation;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Commands.CriarFinanciamento;

public class CriarFinanciamentoCommandValidator : AbstractValidator<CriarFinanciamentoCommand>
{
    public CriarFinanciamentoCommandValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Valor).GreaterThan(0);
        RuleFor(x => x.ContaId).NotEmpty();
        RuleFor(x => x.ValorPrestacao).GreaterThan(0);
        RuleFor(x => x.Periodicidade).IsInEnum();
    }
}
```

- [ ] **Step 5: Atualizar `FinanciamentoDto.cs`**

```csharp
using BalanceProjectionApp.Domain.Enums;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Dtos;

public record FinanciamentoDto(
    Guid Id,
    string Nome,
    decimal Valor,
    DateOnly Data,
    Guid ContaId,
    Guid? DespesaId,
    decimal ValorPrestacao,
    Periodicidade? Periodicidade,
    int TotalParcelas,
    int ParcelasPagas,
    decimal ValorPago,
    decimal ValorRestante,
    decimal ProgressoPercentagem);
```

- [ ] **Step 6: Atualizar `ListarFinanciamentosQueryHandler.cs`**

```csharp
using BalanceProjectionApp.Application.Features.Financiamentos.Dtos;
using BalanceProjectionApp.Domain.Interfaces;
using MediatR;

namespace BalanceProjectionApp.Application.Features.Financiamentos.Queries.ListarFinanciamentos;

public class ListarFinanciamentosQueryHandler(IFinanciamentoRepository repository)
    : IRequestHandler<ListarFinanciamentosQuery, IEnumerable<FinanciamentoDto>>
{
    public async Task<IEnumerable<FinanciamentoDto>> Handle(ListarFinanciamentosQuery request, CancellationToken cancellationToken)
    {
        var financiamentos = await repository.ListarPorContaAsync(request.ContaId, cancellationToken);
        return financiamentos.Select(f =>
        {
            var parcelas = f.Despesa?.Parcelas ?? [];
            var totalParcelas = parcelas.Count;
            var parcelasPagas = parcelas.Count(p => p.IsPaid);
            var valorPago = Math.Min(parcelas.Where(p => p.IsPaid).Sum(p => p.ValorLiquido), f.Valor);
            var valorRestante = Math.Max(f.Valor - valorPago, 0m);
            var valorPrestacao = f.Despesa?.ValorFixo
                ?? parcelas.OrderBy(p => p.Numero).FirstOrDefault()?.ValorLiquido
                ?? 0m;
            var progressoPercentagem = f.Valor <= 0
                ? 0m
                : Math.Round(valorPago * 100m / f.Valor, 2);

            return new FinanciamentoDto(
                f.Id, f.Nome, f.Valor, f.Data, f.ContaId, f.DespesaId,
                valorPrestacao,
                f.Despesa?.Periodicidade,
                totalParcelas, parcelasPagas, valorPago, valorRestante, progressoPercentagem);
        });
    }
}
```

- [ ] **Step 7: Correr testes de Application**

```bash
dotnet test tests/BalanceProjectionApp.Application.Tests/BalanceProjectionApp.Application.Tests.csproj
```

Expected: todos os testes passam.

---

## Task 8: Infrastructure — ReceitaConfiguration + Migração

**Files:**
- Modify: `src/BalanceProjectionApp.Infrastructure/Persistence/Configurations/ReceitaConfiguration.cs`
- Create: nova migração EF Core

- [ ] **Step 1: Atualizar `ReceitaConfiguration.cs`**

```csharp
using BalanceProjectionApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BalanceProjectionApp.Infrastructure.Persistence.Configurations;

public class ReceitaConfiguration : IEntityTypeConfiguration<Receita>
{
    public void Configure(EntityTypeBuilder<Receita> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Nome).IsRequired().HasMaxLength(200);
        builder.HasQueryFilter(r => !r.IsDeleted);

        builder.HasOne(r => r.Conta)
            .WithMany()
            .HasForeignKey(r => r.ContaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Colaborador)
            .WithMany()
            .HasForeignKey(r => r.ColaboradorId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(r => r.Parcelas)
            .WithOne(p => p.Receita)
            .HasForeignKey(p => p.ReceitaId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

- [ ] **Step 2: Verificar compilação Infrastructure**

```bash
dotnet build src/BalanceProjectionApp.Infrastructure/BalanceProjectionApp.Infrastructure.csproj
```

Expected: Build succeeded.

- [ ] **Step 3: Gerar migração**

Garantir que o container Docker está a correr (`docker compose up db -d`) e depois:

```bash
dotnet ef migrations add FinancialModelChanges --project src/BalanceProjectionApp.Infrastructure --startup-project src/BalanceProjectionApp.ApiService
```

Expected: migração criada em `src/BalanceProjectionApp.Infrastructure/Migrations/`.

- [ ] **Step 4: Verificar migração gerada**

Abrir o ficheiro de migração gerado e confirmar que contém:
- Drop de coluna `ValorTotal` em `Receitas`
- Alteração de tipo da coluna `Categoria` em `Receitas` (de `character varying` para `integer`)
- Alteração no enum `CategoriaContrato` (remoção de `Aluguer`)

---

## Task 9: UI — types.ts

**Files:**
- Modify: `ui/web/src/lib/types.ts`

- [ ] **Step 1: Substituir `types.ts`**

```typescript
// CategoriaReceita — enum estático para Receitas
export type CategoriaReceita = 'Vendas' | 'Arrendamentos' | 'Outros';

export const CATEGORIA_RECEITA_LABELS: Record<CategoriaReceita, string> = {
  Vendas: 'Vendas',
  Arrendamentos: 'Arrendamentos',
  Outros: 'Outros',
};

export const CATEGORIAS_RECEITA = Object.keys(CATEGORIA_RECEITA_LABELS) as CategoriaReceita[];

// CategoriaContrato — enum para Despesas (sem Aluguer)
export type CategoriaContrato =
  | 'Servicos'
  | 'Produtos'
  | 'Salarios'
  | 'Impostos'
  | 'IVA'
  | 'Financiamento'
  | 'Outro';

export const CATEGORIA_LABELS: Record<CategoriaContrato, string> = {
  Servicos: 'Serviços',
  Produtos: 'Produtos',
  Salarios: 'Salários',
  Impostos: 'Impostos',
  IVA: 'IVA',
  Financiamento: 'Financiamento',
  Outro: 'Outro',
};

export const CATEGORIAS = Object.keys(CATEGORIA_LABELS) as CategoriaContrato[];

export type TipoDespesa = 'Pontual' | 'Fixa' | 'Recorrente';

export const TIPO_DESPESA_LABELS: Record<TipoDespesa, string> = {
  Pontual: 'Pontual',
  Fixa: 'Fixa',
  Recorrente: 'Recorrente',
};

export type Periodicidade = 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';

export const PERIODICIDADE_LABELS: Record<Periodicidade, string> = {
  Mensal: 'Mensal',
  Trimestral: 'Trimestral',
  Semestral: 'Semestral',
  Anual: 'Anual',
};

// ── Response DTOs ──────────────────────────────────────────────────────────────

export interface ColaboradorDto {
  id: string;
  nome: string;
  percentagem: number;
}

export interface ContaDto {
  id: string;
  nome: string;
  saldo: number;
}

export interface ParcelaDto {
  id: string;
  numero: number;
  /** YYYY-MM-DD */
  dataVencimento: string;
  valorBruto: number;
  valorLiquido: number;
  isPaid: boolean;
  /** YYYY-MM-DD or null */
  dataPagamento: string | null;
  receitaId: string | null;
  despesaId: string | null;
  contaId: string;
  percentagem: number | null;
  nome: string | null;
}

export interface ReceitaDto {
  id: string;
  nome: string;
  categoria: CategoriaReceita | null;
  contaId: string;
  valorTotal: number;
  colaboradorId: string | null;
  colaboradorNome: string | null;
  percentagemComissao: number | null;
  /** ISO datetime string */
  updatedAt: string;
  parcelas: ParcelaDto[];
}

export interface DespesaDto {
  id: string;
  nome: string;
  categoria: CategoriaContrato | null;
  contaId: string;
  tipoDespesa: TipoDespesa;
  valorFixo: number | null;
  periodicidade: Periodicidade | null;
  dataInicio: string | null;
  isActive: boolean;
  /** ISO datetime string */
  updatedAt: string;
  parcelas: ParcelaDto[];
}

export interface FinanciamentoDto {
  id: string;
  nome: string;
  valor: number;
  /** YYYY-MM-DD */
  data: string;
  contaId: string;
  despesaId: string | null;
  valorPrestacao: number;
  periodicidade: Periodicidade | null;
  totalParcelas: number;
  parcelasPagas: number;
  valorPago: number;
  valorRestante: number;
  progressoPercentagem: number;
}

// ── Request bodies ─────────────────────────────────────────────────────────────

export interface CriarColaboradorRequest {
  nome: string;
  percentagem: number;
}

export interface CriarContaRequest {
  nome: string;
  saldoInicial?: number;
}

export interface CriarReceitaParcelaRequest {
  numero: number;
  /** YYYY-MM-DD */
  dataVencimento: string;
  valor: number;
}

export interface CriarDespesaParcelaRequest {
  numero: number;
  /** YYYY-MM-DD */
  dataVencimento: string;
  valorBruto: number;
}

export interface CriarReceitaRequest {
  nome: string;
  contaId: string;
  categoria?: CategoriaReceita;
  colaboradorId?: string;
  parcelas: CriarReceitaParcelaRequest[];
  temIva?: boolean;
}

export interface AtualizarReceitaRequest {
  nome: string;
  categoria?: CategoriaReceita;
  colaboradorId?: string;
  parcelas: CriarReceitaParcelaRequest[];
}

export interface CriarDespesaRequest {
  nome: string;
  contaId: string;
  categoria?: CategoriaContrato;
  tipoDespesa: TipoDespesa;
  parcelas?: CriarDespesaParcelaRequest[];
  valorFixo?: number;
  periodicidade?: Periodicidade;
  dataInicio?: string;
}

export interface AtualizarDespesaRequest {
  nome: string;
  categoria?: CategoriaContrato;
}

export interface AdicionarParcelaDespesaRequest {
  /** YYYY-MM-DD */
  dataVencimento: string;
  valorBruto: number;
}

export interface CriarFinanciamentoRequest {
  nome: string;
  valor: number;
  contaId: string;
  valorPrestacao: number;
  periodicidade: Periodicidade;
  dataPrimeiraParcela: string;
}
```

- [ ] **Step 2: Verificar que o TypeScript compila**

```bash
cd ui/web && npx tsc --noEmit
```

Expected: erros de compilação em `ReceitaView.tsx`, `DespesaView.tsx`, `FinanciamentoView.tsx` — resolvidos nas próximas tasks.

---

## Task 10: UI — ReceitaView.tsx

**Files:**
- Modify: `ui/web/src/components/ReceitaView.tsx`

- [ ] **Step 1: Atualizar tipos do formulário e helpers**

Substituir as secções `// ── Form types` e `// ── Component` até ao fim.

**Tipos e helpers no topo do ficheiro** (substituir a partir da linha 1 até à linha `export function ReceitaView`):

```typescript
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/pagination';
import { Search, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LiquidarDialog } from '@/components/LiquidarDialog';
import { ParcelasTable } from '@/components/ParcelasTable';
import { formatDateTime } from '@/lib/dates';
import { useToast } from '@/hooks/useToast';
import { useAsync } from '@/hooks/useAsync';
import { useParcelaActions } from '@/hooks/useParcelaActions';
import { api } from '@/lib/api';
import {
  CATEGORIAS_RECEITA, CATEGORIA_RECEITA_LABELS,
  type CategoriaReceita, type ColaboradorDto, type ReceitaDto,
} from '@/lib/types';

// ── Form types ─────────────────────────────────────────────────────────────────

interface ReceitaForm {
  nome: string;
  contaId: string;
  categoria: CategoriaReceita | '';
  colaboradorId: string;
  temIva: boolean;
  parcelas: { dataVencimento: string; valor: string }[];
}

const emptyForm = (contaId = ''): ReceitaForm => ({
  nome: '',
  contaId,
  categoria: '',
  colaboradorId: '',
  temIva: false,
  parcelas: [{ dataVencimento: '', valor: '' }],
});

const receitaToForm = (r: ReceitaDto): ReceitaForm => ({
  nome: r.nome,
  contaId: r.contaId,
  categoria: r.categoria ?? '',
  colaboradorId: r.colaboradorId ?? '',
  parcelas: r.parcelas
    .filter(p => !p.isPaid)
    .sort((a, b) => a.numero - b.numero)
    .map(p => ({
      dataVencimento: p.dataVencimento,
      valor: String(p.valorBruto),
    })),
});
```

- [ ] **Step 2: Atualizar lógica do componente**

Substituir as funções internas do componente (`addParcela`, `removeParcela`, `updateParcela`, `totalPercentagem`, `validateForm`, `handleCreate`, `handleEdit`):

```typescript
const addParcela = () =>
  setForm(f => ({ ...f, parcelas: [...f.parcelas, { dataVencimento: '', valor: '' }] }));

const removeParcela = (i: number) =>
  setForm(f => ({ ...f, parcelas: f.parcelas.filter((_, idx) => idx !== i) }));

const updateParcela = (i: number, field: keyof ReceitaForm['parcelas'][0], value: string) =>
  setForm(f => ({ ...f, parcelas: f.parcelas.map((p, idx) => idx === i ? { ...p, [field]: value } : p) }));

const somaParcelasBruto = useMemo(
  () => form.parcelas.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0),
  [form.parcelas],
);

const validateForm = () => {
  if (!form.nome.trim()) { toast('Nome obrigatório', 'error'); return false; }
  if (!form.contaId) { toast('Selecione uma conta', 'error'); return false; }
  if (form.parcelas.length === 0) { toast('Adicione pelo menos uma parcela', 'error'); return false; }
  if (form.parcelas.some(p => !p.dataVencimento || !p.valor || parseFloat(p.valor) <= 0)) {
    toast('Preencha todas as parcelas com valores positivos', 'error'); return false;
  }
  return true;
};

const handleCreate = async () => {
  if (!validateForm()) return;
  setSaving(true);
  try {
    await api.receitas.criar({
      nome: form.nome.trim(),
      contaId: form.contaId,
      categoria: form.categoria || undefined,
      colaboradorId: form.colaboradorId || undefined,
      temIva: form.temIva,
      parcelas: form.parcelas.map((p, i) => ({
        numero: i + 1,
        dataVencimento: p.dataVencimento,
        valor: parseFloat(p.valor),
      })),
    });
    toast('Receita criada com sucesso');
    setCreateOpen(false);
    setForm(emptyForm());
    reload();
  } catch (e) {
    toast((e as Error).message, 'error');
  } finally {
    setSaving(false);
  }
};

const handleEdit = async () => {
  if (!editingId || !validateForm()) return;
  setSaving(true);
  try {
    await api.receitas.atualizar(editingId, {
      nome: form.nome.trim(),
      categoria: form.categoria || undefined,
      colaboradorId: form.colaboradorId || undefined,
      parcelas: form.parcelas.map((p, i) => ({
        numero: i + 1,
        dataVencimento: p.dataVencimento,
        valor: parseFloat(p.valor),
      })),
    });
    toast('Receita atualizada');
    setEditOpen(false);
    reload();
  } catch (e) {
    toast((e as Error).message, 'error');
  } finally {
    setSaving(false);
  }
};
```

- [ ] **Step 3: Atualizar `renderFormDialog`**

Substituir o corpo do dialog no `renderFormDialog`. As principais mudanças:

1. Remover o campo "VALOR TOTAL (€)"
2. Substituir o `Input` de categoria por `Select`
3. Substituir "Percentagem (%)" por "Valor (€)" nas parcelas
4. Remover o indicador `x% / 100%`
5. Atualizar preview IVA para usar soma das parcelas

```tsx
const renderFormDialog = (mode: 'create' | 'edit') => {
  const isEdit = mode === 'edit';
  return (
    <Dialog open={isEdit ? editOpen : createOpen} onOpenChange={open => {
      if (!open) { isEdit ? setEditOpen(false) : setCreateOpen(false); setForm(emptyForm()); }
      else { isEdit ? setEditOpen(true) : setCreateOpen(true); }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'As parcelas não liquidadas serão substituídas pelas novas.'
              : 'Defina as parcelas da receita com o valor de cada uma.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="rf-nome" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">NOME *</Label>
              <Input id="rf-nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="mt-1.5" placeholder="Ex: Projeto ABC" />
            </div>
            {!isEdit && (
              <div>
                <Label htmlFor="rf-conta" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">CONTA *</Label>
                <Select value={form.contaId} onValueChange={v => setForm(f => ({ ...f, contaId: v }))}>
                  <SelectTrigger id="rf-conta" className="mt-1.5"><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
                  <SelectContent>
                    {(contas ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="rf-cat" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">CATEGORIA</Label>
              <Select value={form.categoria || '_none'} onValueChange={v => setForm(f => ({ ...f, categoria: v === '_none' ? '' : v as CategoriaReceita }))}>
                <SelectTrigger id="rf-cat" className="mt-1.5"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem categoria</SelectItem>
                  {CATEGORIAS_RECEITA.map(c => <SelectItem key={c} value={c}>{CATEGORIA_RECEITA_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rf-col" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">COLABORADOR</Label>
              <Select value={form.colaboradorId || '_none'} onValueChange={v => setForm(f => ({ ...f, colaboradorId: v === '_none' ? '' : v }))}>
                <SelectTrigger id="rf-col" className="mt-1.5"><SelectValue placeholder="Sem colaborador" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem colaborador</SelectItem>
                  {(colaboradores ?? []).map((c: ColaboradorDto) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome} ({c.percentagem}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isEdit && (
              <div className="col-span-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.temIva}
                    onChange={e => setForm(f => ({ ...f, temIva: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Sujeito a IVA (23%)
                    {form.temIva && somaParcelasBruto > 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        — despesa de IVA criada automaticamente: €{(somaParcelasBruto * 0.23).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </span>
                </label>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">PARCELAS *</Label>
              <Button type="button" size="sm" variant="outline" onClick={addParcela}><Plus className="w-3.5 h-3.5 mr-1" />Adicionar</Button>
            </div>
            <div className="space-y-2">
              {form.parcelas.map((p, i) => (
                <div key={i} className="grid grid-cols-[1fr_140px_auto] gap-2 items-end">
                  <div>
                    <label className="text-xs text-gray-500">Vencimento</label>
                    <input type="date" value={p.dataVencimento} onChange={e => updateParcela(i, 'dataVencimento', e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Valor (€)</label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        value={p.valor}
                        onChange={e => updateParcela(i, 'valor', e.target.value)}
                        step="0.01" min="0" placeholder="0.00"
                        className="pl-6"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                    </div>
                  </div>
                  {form.parcelas.length > 1 && (
                    <Button type="button" size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 mb-0.5" onClick={() => removeParcela(i)}>✕</Button>
                  )}
                </div>
              ))}
            </div>
            {isEdit && editingReceita && editingReceita.parcelas.some(p => p.isPaid) && (
              <div className="flex items-start justify-between gap-2 mt-2 bg-amber-50 border border-amber-200 rounded p-2">
                <p className="text-xs text-amber-600">
                  {editingReceita.parcelas.filter(p => p.isPaid).length} parcela(s) já liquidada(s) serão mantidas e não podem ser editadas.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { isEdit ? setEditOpen(false) : setCreateOpen(false); setForm(emptyForm()); }}>Cancelar</Button>
            <Button onClick={isEdit ? handleEdit : handleCreate} disabled={saving}>
              {saving ? 'A guardar...' : isEdit ? 'Guardar Alterações' : 'Criar Receita'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd ui/web && npx tsc --noEmit
```

Expected: sem erros em `ReceitaView.tsx`.

---

## Task 11: UI — DespesaView.tsx

**Files:**
- Modify: `ui/web/src/components/DespesaView.tsx`

- [ ] **Step 1: Atualizar imports — usar `CATEGORIAS_MANUAIS` filtrado**

No topo do ficheiro, actualizar o import de types:

```typescript
import {
  CATEGORIAS, CATEGORIA_LABELS, type CategoriaContrato, type DespesaDto,
  type TipoDespesa, type Periodicidade,
  PERIODICIDADE_LABELS,
} from '@/lib/types';
```

Após os imports, adicionar a constante que exclui IVA e Financiamento do create form:

```typescript
const CATEGORIAS_MANUAIS = CATEGORIAS.filter(
  c => c !== 'IVA' && c !== 'Financiamento'
);
```

- [ ] **Step 2: Actualizar `buildCriarPayload` para Recorrente incluir periodicidade**

Substituir o bloco `if (form.tipoDespesa === 'Recorrente')`:

```typescript
if (form.tipoDespesa === 'Recorrente') {
  if (!nome || !form.contaId || !form.valorFixo || !form.periodicidade || !form.dataInicio)
    return null;
  return { ...base, tipoDespesa: 'Recorrente' as const, valorFixo: parseFloat(form.valorFixo), periodicidade: form.periodicidade as Periodicidade, dataInicio: form.dataInicio };
}
```

- [ ] **Step 3: Ocultar botão editar para Financiamento**

No render da tabela, onde está a condição `{d.categoria !== 'IVA' && (`, alterar para:

```tsx
{d.categoria !== 'IVA' && d.categoria !== 'Financiamento' && (
  <Button
    size="sm" variant="ghost"
    className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
    title="Editar"
    onClick={e => openEdit(d, e)}
  >
    <Pencil className="w-3.5 h-3.5" />
  </Button>
)}
```

Fazer o mesmo no mobile overlay (linha ~563):

```tsx
{expandedDespesa.categoria !== 'IVA' && expandedDespesa.categoria !== 'Financiamento' && (
  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400"
    onClick={() => setAddParcelaOpen(true)}>
    <Plus className="w-3.5 h-3.5" />
  </Button>
)}
```

- [ ] **Step 4: Usar `CATEGORIAS_MANUAIS` no select de criar**

No dialog de criar, substituir:
```tsx
{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>)}
```
por:
```tsx
{CATEGORIAS_MANUAIS.map(c => <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>)}
```

(Apenas no dialog de criar. No dialog de editar, manter `CATEGORIAS` para que despesas existentes com qualquer categoria possam ser editadas, mas IVA e Financiamento serão rejeitados pelo backend de qualquer forma.)

- [ ] **Step 5: Adicionar select de periodicidade para Recorrente**

No bloco `{form.tipoDespesa !== 'Pontual' && (...)`, dentro do `grid`, adicionar o select de periodicidade também para Recorrente:

```tsx
{(form.tipoDespesa === 'Fixa' || form.tipoDespesa === 'Recorrente') && (
  <div>
    <Label htmlFor="cd-periodicidade" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">PERIODICIDADE *</Label>
    <Select value={form.periodicidade} onValueChange={v => setForm(f => ({ ...f, periodicidade: v as Periodicidade }))}>
      <SelectTrigger id="cd-periodicidade" className="mt-1.5"><SelectValue placeholder="Selecionar" /></SelectTrigger>
      <SelectContent>
        {(Object.keys(PERIODICIDADE_LABELS) as Periodicidade[]).map(p => (
          <SelectItem key={p} value={p}>{PERIODICIDADE_LABELS[p]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

(Remover o bloco anterior que só mostrava periodicidade para Fixa: `{form.tipoDespesa === 'Fixa' && (...)}`)

- [ ] **Step 6: Actualizar descrição de Recorrente**

```tsx
{form.tipoDespesa === 'Recorrente' && 'Periodicidade configurável; o valor pode variar na liquidação.'}
```

- [ ] **Step 7: Verificar TypeScript**

```bash
cd ui/web && npx tsc --noEmit
```

Expected: sem erros em `DespesaView.tsx`.

---

## Task 12: UI — FinanciamentoView.tsx

**Files:**
- Modify: `ui/web/src/components/FinanciamentoView.tsx`

- [ ] **Step 1: Actualizar imports e `CreateForm`**

```typescript
import { useCallback, useMemo, useRef, useState } from 'react';
import { Search, Plus, Building2, TrendingDown, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatDate } from '@/lib/dates';
import { useToast } from '@/hooks/useToast';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { PERIODICIDADE_LABELS, type FinanciamentoDto, type Periodicidade } from '@/lib/types';

interface CreateForm {
  nome: string;
  valor: string;
  valorPrestacao: string;
  periodicidade: Periodicidade | '';
  dataPrimeiraParcela: string;
  contaId: string;
}

const emptyForm = (): CreateForm => ({
  nome: '',
  valor: '',
  valorPrestacao: '',
  periodicidade: '',
  dataPrimeiraParcela: '',
  contaId: '',
});
```

- [ ] **Step 2: Actualizar `FinanciamentoCard`**

```tsx
function FinanciamentoCard({ f, contaNome, onEliminar }: { f: FinanciamentoDto; contaNome: string; onEliminar: () => void }) {
  const pct = Math.max(0, Math.min(100, f.progressoPercentagem));
  const mesesPorPrestacao = f.periodicidade === 'Mensal' ? 1
    : f.periodicidade === 'Trimestral' ? 3
    : f.periodicidade === 'Semestral' ? 6
    : f.periodicidade === 'Anual' ? 12
    : 1;
  const prestacoesRestantes = f.valorRestante > 0 && f.valorPrestacao > 0
    ? Math.ceil(f.valorRestante / f.valorPrestacao)
    : 0;
  const mesesRestantes = prestacoesRestantes * mesesPorPrestacao;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">{f.nome}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{contaNome} · {formatDate(f.data)}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Total</p>
          <p className="text-lg font-bold tabular-nums text-slate-900">
            €{f.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>Amortização</span>
          <span className="tabular-nums font-medium">{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-1">
        <div className="bg-slate-50 rounded-lg p-2.5">
          <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Pago</p>
          <p className="text-sm font-bold tabular-nums text-emerald-600 mt-1">
            €{f.valorPago.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5">
          <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Restante</p>
          <p className="text-sm font-bold tabular-nums text-rose-600 mt-1">
            €{f.valorRestante.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5">
          <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Prestação</p>
          <p className="text-sm font-bold tabular-nums text-indigo-600 mt-1">
            €{f.valorPrestacao.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            {f.periodicidade && <span className="text-[10px] font-normal text-slate-400 ml-0.5">/{PERIODICIDADE_LABELS[f.periodicidade].toLowerCase()}</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5" />
          {f.parcelasPagas} prestações pagas
        </span>
        <div className="flex items-center gap-2">
          {mesesRestantes > 0 && (
            <span className="tabular-nums">~{mesesRestantes} meses restantes</span>
          )}
          {f.valorRestante <= 0 && (
            <span className="text-emerald-600 font-medium">Liquidado</span>
          )}
          <Button
            size="sm" variant="ghost"
            className="h-6 w-6 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50"
            onClick={onEliminar}
            aria-label="Eliminar financiamento"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Actualizar `handleCreate`**

```typescript
const handleCreate = async () => {
  if (!form.nome.trim() || !form.valor || !form.valorPrestacao || !form.periodicidade || !form.dataPrimeiraParcela || !form.contaId) {
    toast('Preencha todos os campos obrigatórios', 'error');
    return;
  }
  setSaving(true);
  try {
    await api.financiamentos.criar({
      nome: form.nome.trim(),
      valor: Number.parseFloat(form.valor),
      contaId: form.contaId,
      valorPrestacao: Number.parseFloat(form.valorPrestacao),
      periodicidade: form.periodicidade as Periodicidade,
      dataPrimeiraParcela: form.dataPrimeiraParcela,
    });
    toast('Financiamento registado. Valor creditado na conta.');
    setCreateOpen(false);
    setForm(emptyForm());
    reload();
  } catch (e) {
    toast((e as Error).message, 'error');
  } finally {
    setSaving(false);
  }
};
```

- [ ] **Step 4: Actualizar o dialog de criar**

Substituir o conteúdo do `<Dialog>` de criar:

```tsx
<Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) setForm(emptyForm()); }}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>Novo Financiamento</DialogTitle>
      <DialogDescription>
        O valor será creditado imediatamente na conta selecionada e uma despesa de prestações será criada automaticamente.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4 mt-4">
      <div>
        <Label htmlFor="cf-nome" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome *</Label>
        <Input
          id="cf-nome"
          value={form.nome}
          onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          className="mt-1.5"
          placeholder="Ex: Empréstimo Bancário"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cf-valor" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor Total *</Label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
            <Input
              id="cf-valor"
              type="number"
              value={form.valor}
              onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
              className="pl-7 tabular-nums"
              step="0.01" min="0" placeholder="0.00"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="cf-prestacao" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Prestação *</Label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
            <Input
              id="cf-prestacao"
              type="number"
              value={form.valorPrestacao}
              onChange={e => setForm(f => ({ ...f, valorPrestacao: e.target.value }))}
              className="pl-7 tabular-nums"
              step="0.01" min="0" placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cf-periodicidade" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Periodicidade *</Label>
          <Select value={form.periodicidade} onValueChange={v => setForm(f => ({ ...f, periodicidade: v as Periodicidade }))}>
            <SelectTrigger id="cf-periodicidade" className="mt-1.5"><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIODICIDADE_LABELS) as Periodicidade[]).map(p => (
                <SelectItem key={p} value={p}>{PERIODICIDADE_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="cf-data" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data 1.ª Prestação *</Label>
          <input
            id="cf-data"
            type="date"
            value={form.dataPrimeiraParcela}
            onChange={e => setForm(f => ({ ...f, dataPrimeiraParcela: e.target.value }))}
            className="mt-1.5 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          />
        </div>
      </div>

      {form.valor && form.valorPrestacao && Number(form.valor) > 0 && Number(form.valorPrestacao) > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5 text-xs text-indigo-700">
          Duração estimada: ~{Math.ceil(Number(form.valor) / Number(form.valorPrestacao))} prestações
          {form.periodicidade && ` (${PERIODICIDADE_LABELS[form.periodicidade as Periodicidade].toLowerCase()})`}
        </div>
      )}

      <div>
        <Label htmlFor="cf-conta" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Conta *</Label>
        <Select value={form.contaId} onValueChange={v => setForm(f => ({ ...f, contaId: v }))}>
          <SelectTrigger id="cf-conta" className="mt-1.5"><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
          <SelectContent>
            {(contas ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(emptyForm()); }}>Cancelar</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCreate} disabled={saving}>
          {saving ? 'A guardar...' : 'Registar Financiamento'}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

- [ ] **Step 5: Verificar TypeScript e build UI**

```bash
cd ui/web && npx tsc --noEmit && npm run build
```

Expected: sem erros.

---

## Task 13: Testes finais + build completo

- [ ] **Step 1: Correr todos os testes de domínio e aplicação**

```bash
dotnet test tests/BalanceProjectionApp.Domain.Tests/BalanceProjectionApp.Domain.Tests.csproj
dotnet test tests/BalanceProjectionApp.Application.Tests/BalanceProjectionApp.Application.Tests.csproj
```

Expected: todos os testes passam.

- [ ] **Step 2: Compilar toda a solução**

```bash
dotnet build BalanceProjectionApp.slnx
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Commit único com todas as alterações**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: alterar modelo financeiro — parcelas por valor, categorias, IVA dia 25, financiamento com periodicidade

- Receitas: parcelas inseridas por valor direto (não percentagem); ValorTotal calculado como soma das parcelas; categorias passam a enum estático (Vendas, Arrendamentos, Outros)
- IVA: uma parcela IVA por cada parcela da receita, vencimento no dia 25 (ou mês seguinte se >= dia 25)
- Despesas: remover categoria Aluguer; IVA e Financiamento não criáveis/editáveis manualmente; Recorrente passa a exigir periodicidade
- Financiamentos: ValorMensalidade → ValorPrestacao, periodicidade configurável, data da primeira prestação

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
