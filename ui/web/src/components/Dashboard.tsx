import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronsUpDown, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/hooks/useToast';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/pagination';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/dates';
import type { ParcelaDto } from '@/lib/types';

type SortField = 'nome' | 'vencimento' | 'valorBruto' | 'valorLiquido' | 'pagamento';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'todas' | 'pendentes' | 'liquidadas';
type TipoFilter = 'todas' | 'receitas' | 'despesas';
// YYYY-MM string, null = all months
type MesFilter = string | null;

interface DashboardProps {
  onNavigate: (view: 'receitas' | 'despesas', id: string) => void;
}

function SortIcon({ field, sort }: Readonly<{ field: SortField; sort: { field: SortField; dir: SortDir } }>) {
  if (sort.field !== field) return <ChevronsUpDown className="inline w-3.5 h-3.5 ml-1 text-slate-400" />;
  return sort.dir === 'asc'
    ? <ArrowUp className="inline w-3.5 h-3.5 ml-1 text-indigo-500" />
    : <ArrowDown className="inline w-3.5 h-3.5 ml-1 text-indigo-500" />;
}

export function Dashboard({ onNavigate }: Readonly<DashboardProps>) {
  const toast = useToast();
  const { data: contas, loading: contasLoading, error: contasError, reload: reloadContas } = useAsync(() => api.contas.listar(), []);
  const contasList = useMemo(() => contas ?? [], [contas]);

  const [selectedContaId, setSelectedContaId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formSaldo, setFormSaldo] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteContaId, setDeleteContaId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas');
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('todas');
  const [mesFilter, setMesFilter] = useState<MesFilter>(null);
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'vencimento', dir: 'asc' });

  const effectiveContaId = selectedContaId ?? contasList[0]?.id ?? null;

  const totalSaldo = useMemo(() => contasList.reduce((sum, c) => sum + c.saldo, 0), [contasList]);
  const totalPositivo = useMemo(() => contasList.reduce((sum, c) => sum + Math.max(c.saldo, 0), 0), [contasList]);

  const { data: parcelas, loading: parcelasLoading, reload: reloadParcelas } = useAsync(
    () => effectiveContaId ? api.parcelas.listarPorConta(effectiveContaId) : Promise.resolve([]),
    [effectiveContaId],
  );

  const accountStyles = [
    {
      badge: 'bg-violet-100 text-violet-700 border-violet-200',
      amount: 'text-violet-600',
      bar: 'bg-violet-500',
      selected: 'border-violet-300 ring-2 ring-violet-200',
    },
    {
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
      amount: 'text-blue-600',
      bar: 'bg-blue-500',
      selected: 'border-blue-300 ring-2 ring-blue-200',
    },
    {
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      amount: 'text-emerald-600',
      bar: 'bg-emerald-500',
      selected: 'border-emerald-300 ring-2 ring-emerald-200',
    },
    {
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      amount: 'text-amber-600',
      bar: 'bg-amber-500',
      selected: 'border-amber-300 ring-2 ring-amber-200',
    },
  ] as const;

  const toggleSort = (field: SortField) =>
    setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });

  const filtered = useMemo(() => {
    let list = parcelas ?? [];

    if (statusFilter === 'pendentes') list = list.filter(p => !p.isPaid);
    else if (statusFilter === 'liquidadas') list = list.filter(p => p.isPaid);

    if (tipoFilter === 'receitas') list = list.filter(p => p.receitaId != null);
    else if (tipoFilter === 'despesas') list = list.filter(p => p.despesaId != null);

    if (mesFilter !== null) {
      list = list.filter(p => p.dataVencimento.startsWith(mesFilter));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.nome?.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      const mul = sort.dir === 'asc' ? 1 : -1;
      switch (sort.field) {
        case 'nome':       return (a.nome ?? '').localeCompare(b.nome ?? '') * mul;
        case 'vencimento': return a.dataVencimento.localeCompare(b.dataVencimento) * mul;
        case 'valorBruto': return (a.valorBruto - b.valorBruto) * mul;
        case 'valorLiquido': return (a.valorLiquido - b.valorLiquido) * mul;
        case 'pagamento':  return (a.dataPagamento ?? '').localeCompare(b.dataPagamento ?? '') * mul;
        default: return 0;
      }
    });
  }, [parcelas, statusFilter, tipoFilter, mesFilter, search, sort]);

  const { page, totalPages, pageItems, setPage, reset: resetPage } = usePagination(filtered, 20);

  useEffect(() => { resetPage(); }, [statusFilter, tipoFilter, mesFilter, search, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCriarConta = async () => {
    if (!formNome.trim()) return;
    setSaving(true);
    try {
      await api.contas.criar({ nome: formNome.trim(), saldoInicial: formSaldo ? Number.parseFloat(formSaldo) : undefined });
      toast('Conta criada com sucesso');
      setCreateOpen(false);
      setFormNome('');
      setFormSaldo('');
      reloadContas();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarConta = async () => {
    if (!deleteContaId) return;
    const id = deleteContaId;
    setDeleteContaId(null);
    try {
      await api.contas.eliminar(id);
      toast('Conta eliminada');
      if (selectedContaId === id) setSelectedContaId(null);
      reloadContas();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const navigateToParcela = (p: ParcelaDto) => {
    if (p.receitaId) onNavigate('receitas', p.receitaId);
    else if (p.despesaId) onNavigate('despesas', p.despesaId);
  };

  if (contasError) {
    return (
      <div className="p-6 text-center text-red-600">
        <p className="font-medium">Erro ao carregar contas</p>
        <p className="text-sm mt-1">{contasError}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex-1 overflow-auto">
      <div className="px-4 md:px-5 py-4 md:py-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
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
        </div>

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
                ? [1, 2, 3].map(item => <div key={item} className="h-6 bg-slate-100 animate-pulse rounded" />)
                : contasList.map((c, idx) => {
                    const style = accountStyles[idx % accountStyles.length];
                    const ratio = totalPositivo > 0 ? Math.max(c.saldo, 0) / totalPositivo : 0;
                    const percentage = Math.round(ratio * 100);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelectedContaId(c.id); reloadParcelas(); }}
                        className="w-full text-left"
                        aria-label={`Selecionar conta ${c.nome}`}
                      >
                        <div className="flex items-center justify-between gap-2 text-sm text-slate-500">
                          <span className="truncate">{c.nome}</span>
                          <span className="tabular-nums">{percentage}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full ${style.bar} transition-all`}
                            style={{ width: `${Math.max(4, percentage)}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {contasLoading
            ? [1, 2, 3, 4].map(item => <div key={item} className="h-28 sm:h-40 rounded-xl border border-slate-200 bg-white animate-pulse" />)
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
                        className={`group rounded-xl border bg-white px-3 py-3 sm:px-4 sm:py-4 text-left transition-all ${isSelected ? style.selected : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <div className="flex items-start justify-between">
                          <span className={`inline-flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg border text-xs sm:text-sm font-semibold ${style.badge}`}>
                            {initial}
                          </span>
                          {isSelected && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 sm:h-7 sm:w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={e => { e.stopPropagation(); setDeleteContaId(c.id); }}
                              aria-label="Eliminar conta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                        <p className="mt-2 text-sm sm:text-xl font-semibold text-slate-900 truncate">{c.nome}</p>
                        <p className="mt-0.5 text-xs text-slate-500 hidden sm:block">{isSelected ? 'Conta selecionada' : 'Clique para selecionar'}</p>
                        <p className={`mt-1.5 sm:mt-3 text-base sm:text-2xl font-bold tabular-nums ${style.amount}`}>
                          €{c.saldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="mt-2 h-1 sm:h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full ${style.bar}`} style={{ width: '48%' }} />
                        </div>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-3 py-3 sm:px-4 sm:py-4 text-slate-400 hover:border-indigo-300 hover:bg-indigo-50/30 hover:text-indigo-500 transition-colors"
                  >
                    <div className="h-full min-h-20 sm:min-h-32 flex flex-col items-center justify-center gap-1.5 sm:gap-2">
                      <Plus className="w-5 h-5 sm:w-7 sm:h-7" />
                      <span className="text-xs sm:text-base font-medium">Adicionar Conta</span>
                    </div>
                  </button>
                </>
              )}
        </section>

        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
          {/* Search — always full width, alone */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Pesquisar por nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Filters — single scrollable row on mobile, inline on desktop */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex items-center rounded-full border border-slate-200 p-0.5 bg-slate-50 gap-0.5 flex-shrink-0">
              {(['todas', 'pendentes', 'liquidadas'] as StatusFilter[]).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setStatusFilter(v)}
                  className={`px-3 h-7 text-xs rounded-full font-medium transition-colors ${statusFilter === v ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {v === 'todas' ? 'Todas' : v === 'pendentes' ? 'Pendentes' : 'Liquidadas'}
                </button>
              ))}
            </div>
            <div className="inline-flex items-center rounded-full border border-slate-200 p-0.5 bg-slate-50 gap-0.5 flex-shrink-0">
              {(['todas', 'receitas', 'despesas'] as TipoFilter[]).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTipoFilter(v)}
                  className={`px-3 h-7 text-xs rounded-full font-medium transition-colors ${tipoFilter === v ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {v === 'todas' ? 'Tudo' : v === 'receitas' ? 'Receitas' : 'Despesas'}
                </button>
              ))}
            </div>
            <Select value={mesFilter ?? '__all__'} onValueChange={v => setMesFilter(v === '__all__' ? null : v)}>
              <SelectTrigger className="h-8 text-xs border-slate-200 flex-shrink-0 rounded-full px-3 min-w-[7rem]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os meses</SelectItem>
                {Array.from({ length: 12 }, (_, i) => {
                  const d = new Date();
                  d.setDate(1);
                  d.setMonth(d.getMonth() + i);
                  const value = d.toISOString().slice(0, 7);
                  const label = d.toLocaleString('pt-PT', { month: 'long', year: 'numeric' });
                  return <SelectItem key={value} value={value}>{label}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border-t border-slate-200">
        {parcelasLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />)}
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-slate-50 z-10">
              <TableRow>
                <TableHead className="w-24 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide" onClick={() => toggleSort('nome')}>
                  Nome <SortIcon field="nome" sort={sort} />
                </TableHead>
                <TableHead className="w-32 cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide" onClick={() => toggleSort('vencimento')}>
                  Vencimento <SortIcon field="vencimento" sort={sort} />
                </TableHead>
                <TableHead className="w-32 cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell" onClick={() => toggleSort('pagamento')}>
                  Pagamento <SortIcon field="pagamento" sort={sort} />
                </TableHead>
                <TableHead className="w-28 text-right cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell" onClick={() => toggleSort('valorBruto')}>
                  Bruto <SortIcon field="valorBruto" sort={sort} />
                </TableHead>
                <TableHead className="w-28 text-right cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide" onClick={() => toggleSort('valorLiquido')}>
                  Líquido <SortIcon field="valorLiquido" sort={sort} />
                </TableHead>
                <TableHead className="w-24 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-slate-500 py-10">
                    {effectiveContaId ? 'Nenhuma parcela encontrada' : 'Selecione uma conta'}
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map(p => {
                  const isReceita = p.receitaId != null;
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => navigateToParcela(p)}
                    >
                      <TableCell className="hidden sm:table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isReceita ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {isReceita ? 'Receita' : 'Despesa'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className={`sm:hidden w-2 h-2 rounded-full flex-shrink-0 ${isReceita ? 'bg-green-400' : 'bg-red-400'}`} />
                          <span>
                            {p.nome ?? '—'}
                            <span className="ml-1.5 text-xs text-slate-400 tabular-nums font-normal">#{p.numero}</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 tabular-nums">{formatDate(p.dataVencimento)}</TableCell>
                      <TableCell className="text-sm text-slate-600 tabular-nums hidden sm:table-cell">
                        {p.dataPagamento ? formatDate(p.dataPagamento) : <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-600 tabular-nums hidden sm:table-cell">
                        €{p.valorBruto.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right font-semibold tabular-nums ${isReceita ? 'text-green-600' : 'text-red-600'}`}>
                        {isReceita ? '+' : '-'}€{p.valorLiquido.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.isPaid ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {p.isPaid ? 'Liquidada' : 'Pendente'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={20}
          onPageChange={setPage}
        />
      </div>

      </div>{/* end scroll wrapper */}

      {/* Create conta dialog */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) { setFormNome(''); setFormSaldo(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conta</DialogTitle>
            <DialogDescription>Preencha os dados para criar uma conta bancária.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="conta-nome" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome *</Label>
              <Input
                id="conta-nome"
                placeholder="Ex: Conta Principal"
                value={formNome}
                onChange={e => setFormNome(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="conta-saldo" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Saldo Inicial (€)</Label>
              <Input
                id="conta-saldo"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={formSaldo}
                onChange={e => setFormSaldo(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancelar</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCriarConta} disabled={saving || !formNome.trim()}>
                {saving ? 'A guardar…' : 'Criar Conta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteContaId !== null}
        onOpenChange={open => { if (!open) setDeleteContaId(null); }}
        title="Eliminar conta"
        description="Tem a certeza que deseja eliminar esta conta? Esta ação é irreversível. Contas com receitas, despesas ou financiamentos associados não podem ser eliminadas."
        confirmLabel="Eliminar"
        onConfirm={handleEliminarConta}
      />
    </div>
  );
}
