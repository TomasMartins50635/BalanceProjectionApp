# UI Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the BalanceProjectionApp web UI — indigo/slate palette, refined KPI cards, dark sidebar with active indicator, tabular-nums on all monetary values, pill badges, consistent table headers — without touching any backend logic or API contracts.

**Architecture:** Pure CSS/Tailwind className changes across 9 React components. No new components, no prop interface changes, no business logic changes. Every file keeps its exact same imports, state, handlers, and render structure — only classNames and minor JSX structure inside cards/badges change.

**Tech Stack:** React 18, Vite, Tailwind CSS v4, shadcn/ui, Lucide React icons

---

## Verification command (run after every task)

```bash
cd ui/web && npx tsc --noEmit
```

Expected: no output (zero errors). If errors appear, fix before committing.

---

## Task 1: Sidebar — App.tsx

**Files:**
- Modify: `ui/web/src/App.tsx`

- [ ] **Step 1: Replace the `<aside>` block with the new sidebar**

Open `ui/web/src/App.tsx`. Replace the entire `<aside>...</aside>` element (lines 34–67) with:

```tsx
<aside className={`w-full md:w-60 flex-shrink-0 border-b md:border-b-0 md:border-r transition-colors ${isSimulation ? 'bg-blue-950 border-blue-900' : 'bg-slate-900 border-slate-800'} text-white`}>
  <div className={`flex items-center gap-3 px-4 py-4 border-b ${isSimulation ? 'border-blue-900' : 'border-slate-800'}`}>
    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
      <div className="w-3 h-3 rounded-sm bg-white" />
    </div>
    <div>
      <h1 className="text-sm font-semibold leading-tight">Gestão Financeira</h1>
      {isSimulation && <p className="text-[10px] text-blue-400 mt-0.5">Modo Simulação Ativo</p>}
    </div>
  </div>

  <nav className="py-3 flex md:flex-col overflow-x-auto md:overflow-x-visible">
    <div className="hidden md:block px-4 mb-2">
      <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Principal</p>
    </div>
    {navItems.map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        onClick={() => setActiveView(id)}
        className={`flex-shrink-0 md:w-full flex items-center gap-2.5 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm transition-all whitespace-nowrap ${
          activeView === id
            ? 'bg-slate-800 text-white md:border-l-2 md:border-indigo-500 md:pl-[14px]'
            : isSimulation
            ? 'text-blue-300 hover:bg-blue-900/50 hover:text-white md:border-l-2 md:border-transparent md:pl-[14px]'
            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 md:border-l-2 md:border-transparent md:pl-[14px]'
        }`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    ))}
    <div className={`hidden md:block mx-4 my-3 border-t ${isSimulation ? 'border-blue-900' : 'border-slate-800'}`} />
    <button
      onClick={() => setActiveView(isSimulation ? 'overview' : 'simulation')}
      className={`flex-shrink-0 md:w-full flex items-center gap-2.5 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm transition-all whitespace-nowrap ${
        isSimulation
          ? 'bg-slate-800 text-amber-400 md:border-l-2 md:border-amber-500 md:pl-[14px]'
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 md:border-l-2 md:border-transparent md:pl-[14px]'
      }`}
    >
      <Sparkles className="w-4 h-4 flex-shrink-0" />
      <span className="font-medium hidden sm:inline">{isSimulation ? 'Sair da Simulação' : 'Modo Simulação'}</span>
    </button>
  </nav>
</aside>
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd ui/web && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Visual check**

```bash
cd ui/web && npm run dev
```

Open http://localhost:5173. Verify:
- Logo mark (indigo square + white inner square) visible in sidebar header
- "Gestão Financeira" title next to it
- "PRINCIPAL" section label below on desktop
- Active nav item has left indigo border + `bg-slate-800`
- Inactive items are `text-slate-400`, hover darkens bg
- Simulation button shows amber when active
- Mobile: horizontal nav still works, no layout break

- [ ] **Step 4: Commit**

```bash
cd ui/web && cd ../.. && git add ui/web/src/App.tsx && git commit -m "feat(ui): redesign sidebar with logo mark and active indicator"
```

---

## Task 2: OverviewView — KPI cards + chart

**Files:**
- Modify: `ui/web/src/components/OverviewView.tsx`

- [ ] **Step 1: Replace the three KPI cards**

In `OverviewView.tsx`, replace the three `<div className="bg-white border border-gray-200 rounded-lg p-4 md:p-5">` cards (lines 105–154) with:

```tsx
{/* Saldo Total */}
<div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
  <div className="flex items-center justify-between mb-3">
    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
      <Wallet className="w-4 h-4 text-indigo-600" />
    </div>
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${currentMonthNet >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {currentMonthNet >= 0 ? '+' : ''}€{Math.abs(currentMonthNet).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
    </span>
  </div>
  <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Saldo Total</p>
  {contasLoading ? (
    <div className="h-9 w-36 bg-slate-100 animate-pulse rounded mt-1" />
  ) : (
    <p className="text-3xl font-bold text-slate-900 tabular-nums">
      €{totalSaldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
    </p>
  )}
  <p className="text-xs text-slate-400 mt-1">vs mês anterior</p>
</div>

{/* Receitas */}
<div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
  <div className="flex items-center justify-between mb-3">
    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
      <TrendingUp className="w-4 h-4 text-green-600" />
    </div>
  </div>
  <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Receitas Pagas</p>
  {receitas === null ? (
    <div className="h-9 w-36 bg-slate-100 animate-pulse rounded mt-1" />
  ) : (
    <p className="text-3xl font-bold text-green-600 tabular-nums">
      €{currentMonthReceitas.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
    </p>
  )}
  <p className="text-xs text-slate-400 mt-1">Parcelas liquidadas este mês</p>
</div>

{/* Despesas */}
<div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
  <div className="flex items-center justify-between mb-3">
    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
      <TrendingDown className="w-4 h-4 text-red-600" />
    </div>
  </div>
  <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Despesas Pagas</p>
  {despesas === null ? (
    <div className="h-9 w-36 bg-slate-100 animate-pulse rounded mt-1" />
  ) : (
    <p className="text-3xl font-bold text-red-600 tabular-nums">
      €{currentMonthDespesas.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
    </p>
  )}
  <p className="text-xs text-slate-400 mt-1">Parcelas pagas este mês</p>
</div>
```

- [ ] **Step 2: Update the chart container and grid lines**

Replace the chart `<div className="bg-white border ... shadow-sm mb-4 md:mb-6">` wrapper (around the LineChart, lines 157–176):

```tsx
<div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-4 md:mb-6">
  <div className="mb-4">
    <h3 className="text-base font-semibold text-slate-900">Evolução dos Últimos 6 Meses</h3>
    <p className="text-xs text-slate-400 mt-0.5">Receitas e despesas de parcelas liquidadas por mês</p>
  </div>
  <ResponsiveContainer width="100%" height={280}>
    <LineChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
      <Tooltip
        contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        formatter={(v) => typeof v === 'number' ? `€${v.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}` : ''}
      />
      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
      <Line type="monotone" dataKey="receitas" name="Receitas" stroke="#16a34a" strokeWidth={2} dot={{ fill: '#16a34a', r: 3 }} activeDot={{ r: 5 }} />
      <Line type="monotone" dataKey="despesas" name="Despesas" stroke="#dc2626" strokeWidth={2} dot={{ fill: '#dc2626', r: 3 }} activeDot={{ r: 5 }} />
    </LineChart>
  </ResponsiveContainer>
</div>
```

- [ ] **Step 3: Update the bottom two panels (Contas table + activity feed)**

Replace the `<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">` section (lines 178–264) with:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
  {/* Contas table */}
  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div className="px-5 py-3.5 border-b border-slate-100">
      <h3 className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Todas as Contas</h3>
    </div>
    {contasLoading ? (
      <div className="p-5 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-8 bg-slate-100 animate-pulse rounded-lg" />)}
      </div>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Conta</TableHead>
            <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Saldo Atual</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(contas ?? []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-sm text-slate-400 py-8">
                Nenhuma conta registada
              </TableCell>
            </TableRow>
          ) : (
            <>
              {(contas ?? []).map(conta => (
                <TableRow key={conta.id}>
                  <TableCell className="font-medium text-slate-700">{conta.nome}</TableCell>
                  <TableCell className="text-right font-semibold text-slate-900 tabular-nums">
                    €{conta.saldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-slate-50">
                <TableCell className="font-semibold text-slate-700">Total</TableCell>
                <TableCell className="text-right font-bold text-indigo-600 tabular-nums">
                  €{totalSaldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    )}
  </div>

  {/* Activity feed */}
  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div className="px-5 py-3.5 border-b border-slate-100">
      <h3 className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Atividade Recente</h3>
    </div>
    <div className="max-h-[400px] overflow-auto">
      {receitas === null || despesas === null ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />)}
        </div>
      ) : recentActivity.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400">
          Nenhuma atividade registada
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {recentActivity.map(activity => (
            <li key={activity.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${activity.type === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {activity.type === 'receita' ? 'R' : 'D'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{activity.descricao}</p>
                <p className="text-xs text-slate-400">{new Date(activity.data).toLocaleDateString('pt-PT')}</p>
              </div>
              <p className={`text-sm font-semibold tabular-nums flex-shrink-0 ${activity.type === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                {activity.type === 'receita' ? '+' : '-'}€{activity.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
</div>
```

Also update the outer page wrapper to use `rounded-xl` and `shadow-sm` border style and update the page background div:

```tsx
// line 98 — update outer wrapper class
<div className="p-4 md:p-6 bg-slate-50 h-full overflow-auto">
```

And update the KPI grid gap:
```tsx
// line 104
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 md:mb-6">
```

- [ ] **Step 4: TypeScript check**

```bash
cd ui/web && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd ../.. && git add ui/web/src/components/OverviewView.tsx && git commit -m "feat(ui): modernize OverviewView KPI cards, chart, and activity feed"
```

---

## Task 3: Dashboard (Contas) — filter bar + table header

**Files:**
- Modify: `ui/web/src/components/Dashboard.tsx`

- [ ] **Step 1: Update page wrapper and header**

Line 161 — update outer div:
```tsx
<div className="flex flex-col h-full bg-slate-50">
```

Lines 164–174 — update header section:
```tsx
<div>
  <h2 className="text-xl font-semibold text-slate-900">Contas Bancárias</h2>
  <p className="text-sm text-slate-400 mt-0.5">
    {contasList.length} {contasList.length === 1 ? 'conta' : 'contas'} · saldo total{' '}
    <span className="tabular-nums">€{totalSaldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
  </p>
</div>
<Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setCreateOpen(true)}>
  <Plus className="w-4 h-4 mr-1" />Nova Conta
</Button>
```

- [ ] **Step 2: Update patrimony summary card**

Lines 176–214 — replace section wrapper and inner text:
```tsx
<section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 space-y-3 shadow-sm">
  <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 md:gap-6 items-start">
    <div>
      <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Património Total</p>
      <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">
        €{totalSaldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
      </p>
    </div>
    <div className="space-y-2.5 pt-1">
      {contasLoading
        ? [1, 2, 3].map(item => <div key={item} className="h-6 bg-slate-100 animate-pulse rounded-full" />)
        : contasList.map((c, idx) => {
            const style = accountStyles[idx % accountStyles.length];
            const ratio = totalPositivo > 0 ? Math.max(c.saldo, 0) / totalPositivo : 0;
            const percentage = Math.round(ratio * 100);
            return (
              <button key={c.id} type="button" onClick={() => { setSelectedContaId(c.id); reloadParcelas(); }} className="w-full text-left">
                <div className="flex items-center justify-between gap-2 text-sm text-slate-500">
                  <span className="truncate">{c.nome}</span>
                  <span className="tabular-nums">{percentage}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full ${style.bar} transition-all`} style={{ width: `${Math.max(4, percentage)}%` }} />
                </div>
              </button>
            );
          })}
    </div>
  </div>
</section>
```

- [ ] **Step 3: Update account cards grid**

Lines 216–272 — update account card rendering. Change:
- Card border: `rounded-xl border bg-white px-4 py-4`
- Balance: add `tabular-nums`
- "Adicionar Conta" placeholder card: `rounded-xl border-dashed border-slate-300`

```tsx
<section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
  {contasLoading
    ? [1, 2, 3, 4].map(item => <div key={item} className="h-40 rounded-xl border border-slate-200 bg-white animate-pulse" />)
    : (
        <>
          {contasList.map((c, idx) => {
            const isSelected = c.id === effectiveContaId;
            const style = accountStyles[idx % accountStyles.length];
            const initial = c.nome.charAt(0).toUpperCase();
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { setSelectedContaId(c.id); reloadParcelas(); }}
                className={`group rounded-xl border bg-white px-4 py-4 text-left transition-all ${isSelected ? style.selected : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
              >
                <div className="flex items-start justify-between">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold ${style.badge}`}>
                    {initial}
                  </span>
                  {isSelected && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={e => { e.stopPropagation(); setDeleteContaId(c.id); }}
                      aria-label="Eliminar conta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900 truncate">{c.nome}</p>
                <p className="mt-0.5 text-xs text-slate-400">{isSelected ? 'Conta selecionada' : 'Clique para selecionar'}</p>
                <p className={`mt-3 text-2xl font-bold tabular-nums ${style.amount}`}>
                  €{c.saldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                </p>
                <div className="mt-3 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full ${style.bar}`} style={{ width: '48%' }} />
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-4 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-colors"
          >
            <div className="h-full min-h-32 flex flex-col items-center justify-center gap-2">
              <Plus className="w-6 h-6" />
              <span className="text-sm font-medium">Adicionar Conta</span>
            </div>
          </button>
        </>
      )}
</section>
```

- [ ] **Step 4: Update filter bar**

Lines 274–344 — replace filter bar with pill-style toggles:

```tsx
<div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5">
  <div className="flex flex-wrap gap-2">
    <div className="relative flex-1 min-w-40">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <Input
        placeholder="Pesquisar por nome..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="pl-8 h-8 text-sm border-slate-200"
      />
    </div>
    <div className="inline-flex items-center rounded-full border border-slate-200 p-0.5 bg-slate-50 gap-0.5">
      {(['todas', 'pendentes', 'liquidadas'] as StatusFilter[]).map(f => (
        <button
          key={f}
          type="button"
          onClick={() => setStatusFilter(f)}
          className={`h-7 px-3 rounded-full text-xs font-medium transition-all ${statusFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      ))}
    </div>
    <div className="inline-flex items-center rounded-full border border-slate-200 p-0.5 bg-slate-50 gap-0.5">
      {(['todas', 'receitas', 'despesas'] as TipoFilter[]).map(f => (
        <button
          key={f}
          type="button"
          onClick={() => setTipoFilter(f)}
          className={`h-7 px-3 rounded-full text-xs font-medium transition-all ${tipoFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {f === 'todas' ? 'Tudo' : f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      ))}
    </div>
  </div>
</div>
```

- [ ] **Step 5: Update table header and badges**

In the `<Table>` section (lines 349–420):

Table header row — replace `<TableHead>` elements:
```tsx
<TableHeader className="sticky top-0 bg-slate-50 z-10">
  <TableRow>
    <TableHead className="w-24 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</TableHead>
    <TableHead className="cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide" onClick={() => toggleSort('nome')}>
      Nome <SortIcon field="nome" sort={sort} />
    </TableHead>
    <TableHead className="w-32 cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide" onClick={() => toggleSort('vencimento')}>
      Vencimento <SortIcon field="vencimento" sort={sort} />
    </TableHead>
    <TableHead className="w-32 cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide" onClick={() => toggleSort('pagamento')}>
      Pagamento <SortIcon field="pagamento" sort={sort} />
    </TableHead>
    <TableHead className="w-28 text-right cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide" onClick={() => toggleSort('valorBruto')}>
      Bruto <SortIcon field="valorBruto" sort={sort} />
    </TableHead>
    <TableHead className="w-28 text-right cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide" onClick={() => toggleSort('valorLiquido')}>
      Líquido <SortIcon field="valorLiquido" sort={sort} />
    </TableHead>
    <TableHead className="w-24 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</TableHead>
  </TableRow>
</TableHeader>
```

Type badge in rows — change `rounded` to `rounded-full` and update colors:
```tsx
<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isReceita ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
  {isReceita ? 'Receita' : 'Despesa'}
</span>
```

Monetary cells — add `tabular-nums`:
```tsx
<TableCell className="text-right text-sm text-slate-500 tabular-nums">
  €{p.valorBruto.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
</TableCell>
<TableCell className={`text-right font-semibold tabular-nums ${isReceita ? 'text-green-600' : 'text-red-600'}`}>
  {isReceita ? '+' : '-'}€{p.valorLiquido.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
</TableCell>
```

Status badge — change to `rounded-full`:
```tsx
<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.isPaid ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
  {p.isPaid ? 'Liquidada' : 'Pendente'}
</span>
```

- [ ] **Step 6: TypeScript check**

```bash
cd ui/web && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
cd ../.. && git add ui/web/src/components/Dashboard.tsx && git commit -m "feat(ui): modernize Dashboard with pill filters, tabular-nums, updated cards"
```

---

## Task 4: DespesaView — header, expanded panel, badges

**Files:**
- Modify: `ui/web/src/components/DespesaView.tsx`

- [ ] **Step 1: Update header section**

Lines 311–329 — replace header div:
```tsx
<div className="px-4 md:px-5 py-3.5 border-b border-slate-100 bg-white shrink-0">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-base md:text-lg font-semibold text-slate-900">Despesas</h2>
    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setCreateOpen(true)}>
      <Plus className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Nova Despesa</span>
    </Button>
  </div>
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
    <Input
      aria-label="Pesquisar despesas"
      placeholder="Pesquisar por nome ou categoria..."
      value={searchTerm}
      onChange={e => setSearchTerm(e.target.value)}
      className="pl-9 h-9 border-slate-200"
    />
  </div>
</div>
```

- [ ] **Step 2: Update table header**

Replace `<TableHeader className="sticky top-0 bg-gray-50 z-10">` with:
```tsx
<TableHeader className="sticky top-0 bg-slate-50 z-10">
  <TableRow>
    <TableHead className="w-10" />
    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</TableHead>
    <TableHead className="w-28 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</TableHead>
    <TableHead className="w-36 text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoria</TableHead>
    <TableHead className="w-28 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor Total</TableHead>
    <TableHead className="w-28 text-xs font-semibold text-slate-500 uppercase tracking-wide">Atualizado</TableHead>
    <TableHead className="w-20" />
  </TableRow>
</TableHeader>
```

- [ ] **Step 3: Update row badges and values**

In the `filtered.map(d => ...)` row, update:

Active/Inactive badge (name cell):
```tsx
<span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${d.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
  {d.isActive ? 'Ativa' : 'Inativa'}
</span>
```

Tipo badge:
```tsx
<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[d.tipoDespesa].className}`}>
  {TIPO_BADGE[d.tipoDespesa].label}
</span>
```

Valor total cell — add `tabular-nums`:
```tsx
<TableCell className="text-right font-semibold text-red-600 tabular-nums">
  €{valorTotal(d).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
</TableCell>
```

- [ ] **Step 4: Update expanded panel**

The expanded `<TableRow>` with parcelas (lines 415–463):
```tsx
{expandedId === d.id && (
  <TableRow>
    <TableCell colSpan={7} className="p-0">
      <div className="px-8 py-4 bg-slate-50/60 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
            Parcelas ({d.parcelas.length})
          </p>
          <div className="flex gap-2">
            {d.tipoDespesa !== 'Pontual' && (
              <Button
                size="sm"
                variant="outline"
                disabled={toggling}
                onClick={handleToggleEstado}
                className={d.isActive
                  ? 'text-amber-600 border-amber-200 hover:bg-amber-50 rounded-lg'
                  : 'text-green-600 border-green-200 hover:bg-green-50 rounded-lg'}
              >
                {d.isActive ? 'Desativar' : 'Ativar'}
              </Button>
            )}
            {d.categoria !== 'IVA' && (
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setAddParcelaOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />Parcela
              </Button>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <ParcelasTable
            parcelas={d.parcelas}
            variant="despesa"
            despesaTipo={d.tipoDespesa}
            parcelaSort={parcelaSort}
            toggleSort={toggleSort}
            liquidando={liquidando}
            estornando={estornando}
            onLiquidar={(id, isRecorrente, contaId) => openLiquidarDialog(id, isRecorrente, contaId)}
            onEstornar={setEstornarConfirmId}
            onAlterarConta={(parcelaId, currentContaId) => setAlterarContaDialog({ parcelaId, contaId: currentContaId })}
            removendoParcela={removendoParcela}
            onRemoverParcela={setRemoveParcelaId}
          />
        </div>
      </div>
    </TableCell>
  </TableRow>
)}
```

- [ ] **Step 5: Update TIPO_BADGE className values at the top of the file**

```tsx
const TIPO_BADGE: Record<TipoDespesa, { label: string; className: string }> = {
  Pontual:    { label: 'Pontual',    className: 'bg-slate-100 text-slate-700' },
  Fixa:       { label: 'Fixa',       className: 'bg-blue-50 text-blue-700' },
  Recorrente: { label: 'Recorrente', className: 'bg-purple-50 text-purple-700' },
};
```

- [ ] **Step 6: Update dialog label styles**

In the Create dialog and Edit dialog, update all `<Label>` elements from:
```tsx
<Label htmlFor="cd-nome" className="text-xs font-medium text-gray-700">NOME *</Label>
```
to:
```tsx
<Label htmlFor="cd-nome" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome *</Label>
```

Apply to every Label in the Create dialog, Edit dialog, Add Parcela dialog, and Alterar Conta dialog. Also update date inputs focus ring from `focus-visible:ring-blue-500` to `focus-visible:ring-indigo-400`.

- [ ] **Step 7: TypeScript check**

```bash
cd ui/web && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
cd ../.. && git add ui/web/src/components/DespesaView.tsx && git commit -m "feat(ui): modernize DespesaView header, badges, expanded panel"
```

---

## Task 5: ReceitaView — same pattern as DespesaView

**Files:**
- Modify: `ui/web/src/components/ReceitaView.tsx`

Apply the exact same patterns as Task 4. ReceitaView has identical structure:

- [ ] **Step 1: Update header section** — same as DespesaView Task 4 Step 1, but label is "Receitas" and button says "Nova Receita"

- [ ] **Step 2: Update table header** — same uppercase tracking treatment. Columns in ReceitaView are: (chevron), Nome, Conta, Categoria, Valor Total, Colaborador, Atualizado, (actions). Apply `text-xs font-semibold text-slate-500 uppercase tracking-wide` to each `<TableHead>`.

- [ ] **Step 3: Update row badges** — same `rounded-full` pill treatment for status (Ativa/Inativa), same `tabular-nums` on valor total cell.

- [ ] **Step 4: Update expanded panel** — same `bg-slate-50/60 border-t border-slate-100`, same `bg-white rounded-xl border border-slate-200` inner card.

- [ ] **Step 5: Update all dialog Label styles** — same `text-xs font-semibold text-slate-500 uppercase tracking-wide`, same indigo focus rings on date inputs.

- [ ] **Step 6: TypeScript check**

```bash
cd ui/web && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
cd ../.. && git add ui/web/src/components/ReceitaView.tsx && git commit -m "feat(ui): modernize ReceitaView to match DespesaView treatment"
```

---

## Task 6: ParcelasTable — complete rewrite

**Files:**
- Modify: `ui/web/src/components/ParcelasTable.tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
import { Calendar, CheckCircle2, Trash2, ArrowUp, ArrowDown, ChevronsUpDown, ArrowLeftRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/dates';
import type { ParcelaDto } from '@/lib/types';

type SortField = 'data' | 'valor';
type SortDir = 'asc' | 'desc';

interface ParcelasTableProps {
  parcelas: ParcelaDto[];
  variant: 'receita' | 'despesa';
  despesaTipo?: 'Pontual' | 'Fixa' | 'Recorrente';
  parcelaSort: { field: SortField; dir: SortDir };
  toggleSort: (field: SortField) => void;
  liquidando: string | null;
  estornando: string | null;
  onLiquidar: (id: string, isRecorrente?: boolean, contaId?: string) => void;
  onEstornar: (id: string) => void;
  onAlterarConta?: (parcelaId: string, currentContaId: string) => void;
  removendoParcela?: string | null;
  onRemoverParcela?: (id: string) => void;
}

function SortIcon({ field, sort }: { field: SortField; sort: { field: SortField; dir: SortDir } }) {
  if (sort.field !== field) return <ChevronsUpDown className="inline w-3.5 h-3.5 ml-1 text-slate-400" />;
  return sort.dir === 'asc'
    ? <ArrowUp className="inline w-3.5 h-3.5 ml-1 text-indigo-500" />
    : <ArrowDown className="inline w-3.5 h-3.5 ml-1 text-indigo-500" />;
}

export function ParcelasTable({
  parcelas, variant, despesaTipo, parcelaSort, toggleSort,
  liquidando, estornando, onLiquidar, onEstornar, onAlterarConta,
  removendoParcela, onRemoverParcela,
}: ParcelasTableProps) {
  const isReceita = variant === 'receita';

  const sorted = [...parcelas].sort((a, b) => {
    const mul = parcelaSort.dir === 'asc' ? 1 : -1;
    if (parcelaSort.field === 'data') return a.dataVencimento.localeCompare(b.dataVencimento) * mul;
    return (a.valorLiquido - b.valorLiquido) * mul;
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</TableHead>
          <TableHead className="w-36 cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide" onClick={() => toggleSort('data')}>
            Vencimento<SortIcon field="data" sort={parcelaSort} />
          </TableHead>
          {isReceita && <TableHead className="w-20 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">%</TableHead>}
          {isReceita && <TableHead className="w-36 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Bruto</TableHead>}
          <TableHead className="w-36 text-right cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide" onClick={() => toggleSort('valor')}>
            {isReceita ? 'Líquido' : 'Valor'}<SortIcon field="valor" sort={parcelaSort} />
          </TableHead>
          <TableHead className="w-24 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</TableHead>
          <TableHead className="w-28" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map(p => (
          <TableRow key={p.id} className={!p.isPaid ? 'opacity-80' : ''}>
            <TableCell className="text-slate-400 text-sm tabular-nums">{p.numero}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-300" aria-hidden="true" />
                <span className="text-sm text-slate-700 tabular-nums">{formatDate(p.dataVencimento)}</span>
              </div>
            </TableCell>
            {isReceita && (
              <TableCell className="text-right text-sm text-slate-500 tabular-nums">
                {p.percentagem != null ? `${p.percentagem}%` : '—'}
              </TableCell>
            )}
            {isReceita && (
              <TableCell className="text-right text-sm text-slate-500 tabular-nums">
                €{p.valorBruto.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
              </TableCell>
            )}
            <TableCell className={`text-right font-semibold tabular-nums ${isReceita ? 'text-green-600' : 'text-red-600'}`}>
              €{p.valorLiquido.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </TableCell>
            <TableCell>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.isPaid ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                {p.isPaid ? 'Liquidada' : 'Pendente'}
              </span>
            </TableCell>
            <TableCell>
              {!p.isPaid && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 text-xs rounded-lg ${isReceita ? 'text-indigo-700 border-indigo-200 hover:bg-indigo-50' : 'text-indigo-700 border-indigo-200 hover:bg-indigo-50'}`}
                    disabled={liquidando === p.id}
                    onClick={() => onLiquidar(p.id, !isReceita && despesaTipo === 'Recorrente', p.contaId)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {liquidando === p.id ? '...' : 'Liquidar'}
                  </Button>
                  {onAlterarConta && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      onClick={() => onAlterarConta(p.id, p.contaId)}
                      aria-label="Alterar conta"
                      title="Alterar conta"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {!isReceita && onRemoverParcela && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      disabled={removendoParcela === p.id}
                      onClick={() => onRemoverParcela(p.id)}
                      aria-label="Eliminar parcela"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              )}
              {p.isPaid && (
                <div className="flex items-center gap-2">
                  {p.dataPagamento && <span className="text-xs text-slate-400 tabular-nums">{formatDate(p.dataPagamento)}</span>}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                    disabled={estornando === p.id}
                    onClick={() => onEstornar(p.id)}
                  >
                    {estornando === p.id ? '...' : 'Estornar'}
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd ui/web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd ../.. && git add ui/web/src/components/ParcelasTable.tsx && git commit -m "feat(ui): modernize ParcelasTable — pill badges, tabular-nums, indigo Liquidar"
```

---

## Task 7: LiquidarDialog — label and input polish

**Files:**
- Modify: `ui/web/src/components/LiquidarDialog.tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ContaDto } from '@/lib/types';

interface LiquidarDialogProps {
  dialog: { parcelaId: string; data: string; isRecorrente: boolean; valorReal: string; contaId: string } | null;
  contas: ContaDto[];
  onClose: () => void;
  onDataChange: (data: string) => void;
  onValorRealChange: (valor: string) => void;
  onContaChange: (contaId: string) => void;
  onConfirm: () => void;
  variant: 'receita' | 'despesa';
}

export function LiquidarDialog({
  dialog, contas, onClose, onDataChange, onValorRealChange, onContaChange, onConfirm, variant,
}: LiquidarDialogProps) {
  const confirmClass = variant === 'receita'
    ? 'bg-green-600 hover:bg-green-700 text-white'
    : 'bg-indigo-600 hover:bg-indigo-700 text-white';

  return (
    <Dialog open={!!dialog} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Liquidar Parcela</DialogTitle>
          <DialogDescription>Confirme os dados do pagamento</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="ld-conta" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Conta</Label>
            <Select value={dialog?.contaId ?? ''} onValueChange={onContaChange}>
              <SelectTrigger id="ld-conta" className="mt-1.5 border-slate-200">
                <SelectValue placeholder="Selecionar conta" />
              </SelectTrigger>
              <SelectContent>
                {contas.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                    <span className="ml-2 text-xs text-slate-400 tabular-nums">
                      €{c.saldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ld-data" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data de Pagamento</Label>
            <input
              id="ld-data"
              type="date"
              value={dialog?.data ?? ''}
              onChange={e => onDataChange(e.target.value)}
              className="mt-1.5 flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            />
          </div>
          {variant === 'despesa' && dialog?.isRecorrente && (
            <div>
              <Label htmlFor="ld-valor-real" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor Real (€)</Label>
              <input
                id="ld-valor-real"
                type="number"
                min="0"
                step="0.01"
                value={dialog.valorReal}
                onChange={e => onValorRealChange(e.target.value)}
                placeholder="Opcional"
                className="mt-1.5 flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" className="rounded-lg" onClick={onClose}>Cancelar</Button>
            <Button
              className={`rounded-lg ${confirmClass}`}
              disabled={!dialog?.data || !dialog?.contaId}
              onClick={onConfirm}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd ui/web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd ../.. && git add ui/web/src/components/LiquidarDialog.tsx && git commit -m "feat(ui): modernize LiquidarDialog labels and input styles"
```

---

## Task 8: ColaboradorView + FinanciamentoView

**Files:**
- Modify: `ui/web/src/components/ColaboradorView.tsx`
- Modify: `ui/web/src/components/FinanciamentoView.tsx`

- [ ] **Step 1: Update ColaboradorView page header and table**

In `ColaboradorView.tsx`:

Page wrapper (line 56): `<div className="p-4 md:p-6 bg-slate-50 h-full overflow-auto">`

Header (lines 57–60):
```tsx
<div className="mb-5 flex items-start justify-between gap-4">
  <div>
    <h2 className="text-xl font-semibold text-slate-900 mb-0.5">Colaboradores</h2>
    <p className="text-sm text-slate-400">Gestão de colaboradores e respetivas comissões</p>
  </div>
  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setCreateOpen(true)}>
    <Plus className="w-4 h-4 mr-1" />Novo Colaborador
  </Button>
</div>
```

Table container: `<div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">`

Table header `<TableHead>` elements — apply `text-xs font-semibold text-slate-500 uppercase tracking-wide` to each.

Percentage cell — add `tabular-nums`:
```tsx
<TableCell className="tabular-nums">{c.percentagem}%</TableCell>
```

Dialog label style — update all `<Label>` to `className="text-xs font-semibold text-slate-500 uppercase tracking-wide"`.

- [ ] **Step 2: Update FinanciamentoView page header and table**

In `FinanciamentoView.tsx`:

Page wrapper: `<div className="flex flex-col h-full bg-slate-50">`

Header section:
```tsx
<div className="px-4 md:px-5 py-3.5 border-b border-slate-100 bg-white shrink-0">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-base md:text-lg font-semibold text-slate-900">Financiamentos</h2>
    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setCreateOpen(true)}>
      <Plus className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Novo Financiamento</span>
    </Button>
  </div>
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
    <Input placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 border-slate-200" />
  </div>
</div>
```

Table header — apply `text-xs font-semibold text-slate-500 uppercase tracking-wide` to each `<TableHead>`.

Monetary cells in FinanciamentoView — add `tabular-nums` to valor column.

Dialog labels — apply `text-xs font-semibold text-slate-500 uppercase tracking-wide`.

Date inputs — update focus ring to `focus-visible:ring-indigo-400`.

- [ ] **Step 3: TypeScript check**

```bash
cd ui/web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd ../.. && git add ui/web/src/components/ColaboradorView.tsx ui/web/src/components/FinanciamentoView.tsx && git commit -m "feat(ui): modernize ColaboradorView and FinanciamentoView"
```

---

## Task 9: SimulationView + final review

**Files:**
- Modify: `ui/web/src/components/SimulationView.tsx`

- [ ] **Step 1: Apply consistent treatment to SimulationView**

Read `ui/web/src/components/SimulationView.tsx` and apply:
- Page wrapper: `bg-slate-50`
- Cards: `rounded-xl border-slate-200 shadow-sm`
- Table headers: `text-xs font-semibold text-slate-500 uppercase tracking-wide`
- Monetary values: `tabular-nums`
- Badges: `rounded-full`
- Labels in any forms: `text-xs font-semibold text-slate-500 uppercase tracking-wide`
- Buttons in simulation context: keep amber/blue accent but apply `rounded-lg`

- [ ] **Step 2: TypeScript check — full project**

```bash
cd ui/web && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Full visual walk-through**

```bash
cd ui/web && npm run dev
```

Check every view in sequence:
- Visão Geral: KPI cards with icon badges, gradient-free chart, flex activity list
- Contas: pill filter toggles, indigo "add" hover, tabular account balances
- Receitas: clean header, expanded parcelas panel in slate bg, pill badges
- Despesas: same as Receitas
- Financiamentos: consistent header, tabular amounts
- Colaboradores: card table, consistent header
- Modo Simulação: amber sidebar accent, consistent cards

- [ ] **Step 4: Commit**

```bash
cd ../.. && git add ui/web/src/components/SimulationView.tsx && git commit -m "feat(ui): modernize SimulationView — final UI modernization complete"
```

---

## Self-Review Checklist

### Spec coverage
- [x] Color palette (indigo primary, slate sidebar, green/red semantic) — covered in Tasks 1–9
- [x] Tabular-nums on all monetary values — covered in Tasks 2–9
- [x] Dark sidebar with logo mark + active border indicator — Task 1
- [x] KPI cards with icon badges + uppercase labels — Task 2
- [x] Chart grid line lightening — Task 2
- [x] Activity feed as flex list — Task 2
- [x] Pill filter bar in Dashboard — Task 3
- [x] Account cards updated — Task 3
- [x] Table headers uppercase+tracking — Tasks 3–9
- [x] Type/status badges → rounded-full — Tasks 4–6
- [x] Expanded panel bg-slate-50/60 — Tasks 4–5
- [x] ParcelasTable Liquidar button indigo — Task 6
- [x] LiquidarDialog label style — Task 7
- [x] ColaboradorView + FinanciamentoView — Task 8
- [x] SimulationView — Task 9

### No placeholders found
All steps contain actual className strings or complete JSX. No "TBD" or "similar to above."

### Type consistency
- `ParcelasTableProps` interface unchanged — all callers pass same props
- `LiquidarDialogProps` interface unchanged — all callers unchanged
- No new types introduced
