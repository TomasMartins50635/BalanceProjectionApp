# Design: Alterações ao Modelo Financeiro

**Data:** 2026-04-27
**Projeto:** BalanceProjectionApp

---

## Âmbito

Conjunto de alterações ao modelo de receitas, despesas e financiamentos:

1. Parcelas de receita inseridas por valor direto (não percentagem)
2. Categorias de receita passam a ser enum estático (Vendas, Arrendamentos, Outros)
3. Categoria `Aluguer` removida das despesas
4. Despesas IVA e Financiamento não podem ser criadas nem editadas manualmente
5. Despesas recorrentes passam a ter periodicidade configurável
6. IVA cobrado no dia 25 (ou dia 25 do mês seguinte se >= dia 25)
7. Financiamento: periodicidade configurável e data da primeira prestação

---

## Secção 1 — Domain

### Novo enum `CategoriaReceita`

```csharp
public enum CategoriaReceita { Vendas, Arrendamentos, Outros }
```

### `CategoriaContrato` (enum existente)

Remove `Aluguer`. Os restantes valores mantêm-se (`Servicos`, `Produtos`, `Salarios`, `Impostos`, `IVA`, `Financiamento`, `Outro`).

### `Receita` — alterações

- `Categoria` muda de `string?` para `CategoriaReceita?`
- `ValorTotal` removido da entidade — calculado no DTO como `parcelas.Sum(p => p.ValorBruto)`
- `Criar(nome, contaId, categoria?)` — sem `valorTotal`
- `Atualizar(nome, categoria?)` — sem `valorTotal`
- `AdicionarParcela(numero, dataVencimento, valor)` — recebe valor direto:
  - `valorBruto = valor`
  - `valorLiquido = valor - (valor × colaborador.percentagem / 100)` se colaborador associado
  - `percentagem` na parcela passa a ser `null` para receitas

### `Despesa` — alterações

- `Criar(...)`: `TipoDespesa.Recorrente` passa a exigir `periodicidade` obrigatória (igual a `Fixa`)
- `GerarProximaParcela()`: Recorrente usa `Periodicidade` em vez de `+1 mês` hardcoded

### `Financiamento` — sem alterações na entidade

---

## Secção 2 — Application

### Receitas

**`CriarReceitaCommand`**
- Remove `ValorTotal`
- `CriarParcelaDto(Numero, DataVencimento, Valor)` — `Percentagem` substituído por `Valor`
- `Categoria` passa de `string?` para `CategoriaReceita?`

**`CriarReceitaCommandHandler`**
- `Receita.Criar` chamado sem `valorTotal`
- Cada parcela usa `p.Valor` diretamente
- Lógica IVA (quando `TemIva = true`):
  - Para **cada parcela** da receita, cria uma parcela IVA:
    - `valorIva = Math.Round(p.Valor × 0.23, 2)`
    - Data de vencimento IVA:
      - Se `p.DataVencimento.Day < 25` → dia 25 do mesmo mês
      - Se `p.DataVencimento.Day >= 25` → dia 25 do mês seguinte
  - Uma única `DespesaIva` com N parcelas (uma por parcela da receita)

**`AtualizarReceitaCommand` / Handler**
- Mesmas alterações: sem `valorTotal`, parcelas por valor direto

### Despesas

**`CriarDespesaCommandValidator`**
- Rejeita criação se `Categoria == IVA` ou `Categoria == Financiamento`
- `TipoDespesa.Recorrente` passa a exigir `Periodicidade` (validação no validator)

**`AtualizarDespesaCommandValidator`** (novo ou no handler)
- Rejeita edição se despesa tiver `Categoria == IVA` ou `Categoria == Financiamento`

### Financiamentos

**`CriarFinanciamentoCommand`**
- `ValorMensalidade` → `ValorPrestacao`
- Adiciona `Periodicidade Periodicidade` (obrigatória)
- Adiciona `DateOnly DataPrimeiraParcela` (obrigatória)

**`CriarFinanciamentoCommandHandler`**
- Passa `ValorPrestacao` em vez de `ValorMensalidade`
- Passa `Periodicidade` para `Despesa.Criar` (em vez de `Periodicidade.Mensal` hardcoded)
- Passa `DataPrimeiraParcela` como `dataInicio` da despesa (em vez de `DateOnly.FromDateTime(DateTime.UtcNow)`)

### DTOs

**`ReceitaDto`**
- `valorTotal` calculado no handler como `receita.Parcelas.Sum(p => p.ValorBruto)` — não lido da entidade

**`FinanciamentoDto`**
- `valorMensalidade` → `valorPrestacao`
- Adiciona `periodicidade`

---

## Secção 3 — Infrastructure / Migração

**`ReceitaConfiguration`**
- Remove coluna `ValorTotal`
- Adiciona coluna `Categoria` como `int?` (enum `CategoriaReceita`)

**`DespesaConfiguration`**
- A coluna `Categoria` já é `int?`. `Aluguer` é removido do enum C# — como estamos em dev sem dados para preservar, basta uma nova migração.

**Uma migração nova** cobre:
- Drop de `ValorTotal` em `Receitas`
- Retype de `Categoria` em `Receitas` (de string para int?)

---

## Secção 4 — UI

### `types.ts`

- Novo tipo `CategoriaReceita = 'Vendas' | 'Arrendamentos' | 'Outros'` com labels PT
- Remove `Aluguer` de `CategoriaContrato` e de `CATEGORIA_LABELS`
- `CriarReceitaParcelaRequest`: `percentagem: number` → `valor: number`
- `CriarReceitaRequest` / `AtualizarReceitaRequest`: remove `valorTotal`
- `CriarFinanciamentoRequest`: `valorMensalidade` → `valorPrestacao`, adiciona `periodicidade` e `dataPrimeiraParcela`
- `FinanciamentoDto`: `valorMensalidade` → `valorPrestacao`, adiciona `periodicidade`

### `ReceitaView.tsx`

- Remove campo "Valor Total" do formulário
- Remove coluna "Valor Total" da tabela; exibe soma das parcelas calculada no frontend
- Parcelas: "Percentagem (%)" → "Valor (€)"; remove indicador `x% / 100%` e preview calculado
- Categoria: `Input` livre → `Select` com 3 opções (Vendas, Arrendamentos, Outros)
- Preview IVA: mostra `23% × soma dos valores inseridos nas parcelas`

### `DespesaView.tsx`

- Remove `Aluguer` do select de categoria (formulários de criação e edição)
- Oculta `IVA` e `Financiamento` do select de categoria na criação
- Botão editar: já oculto para `IVA`; passa a também ocultar para `Financiamento`
- Recorrente: adiciona select de periodicidade (igual ao que já existe para Fixa)

### `FinanciamentoView.tsx`

- Label "Mensalidade" → "Prestação" em todo o lado
- Adiciona campo "Periodicidade" (select: Mensal, Trimestral, Semestral, Anual)
- Adiciona campo "Data da primeira prestação" (date picker)
- Preview "Duração estimada": ajusta para periodicidade (ex: valor total / prestação = N prestações; N × meses por período = duração em meses)

---

## Regras de negócio críticas

1. Parcelas IVA: não é possível adicionar nem eliminar parcelas de uma despesa com `Categoria == IVA` — botões "Adicionar Parcela" e "Remover Parcela" ocultos na UI; o backend já rejeita edição da despesa IVA inteira
2. Despesas IVA e Financiamento: não criáveis manualmente; não editáveis
3. IVA por parcela: uma parcela IVA por cada parcela da receita, calculada individualmente
4. ValorTotal da Receita: campo calculado (soma das parcelas), não persistido
5. Recorrente vs Fixa: ambas têm periodicidade e valor fixo; Recorrente permite alterar o valor real na liquidação
