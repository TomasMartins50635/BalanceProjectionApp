import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import type { FinanciamentoDto, Periodicidade } from '@/lib/types';
import { PERIODICIDADE_LABELS } from '@/lib/types';

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
  contaId: '' 
});

function FinanciamentoCard({ f, contaNome, onEliminar }: Readonly<{ f: FinanciamentoDto; contaNome: string; onEliminar: () => void }>) {
  const pct = Math.max(0, Math.min(100, f.progressoPercentagem));
  const mesesRestantes = f.valorRestante > 0 && f.valorPrestacao > 0
    ? Math.ceil(f.valorRestante / f.valorPrestacao)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4">
      {/* Header */}
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

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>Amortização</span>
          <span className="tabular-nums font-medium">{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
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
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5" />
          {f.parcelasPagas} parcelas pagas
        </span>
        <div className="flex items-center gap-2">
          {mesesRestantes > 0 && (
            <span className="tabular-nums">~{mesesRestantes} meses restantes</span>
          )}
          {f.valorRestante <= 0 && (
            <span className="text-emerald-600 font-medium">Liquidado</span>
          )}
          <Button
            size="sm"
            variant="ghost"
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

export function FinanciamentoView() {
  const toast = useToast();
  const { data: contas } = useAsync(() => api.contas.listar(), []);

  const { data: financiamentos, loading, error, reload } = useAsync(async () => {
    const contasList = await api.contas.listar();
    if (contasList.length === 0) return [];
    const results = await Promise.all(contasList.map(c => api.financiamentos.listarPorConta(c.id)));
    return results.flat();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [createMode, setCreateMode] = useState<'novo' | 'existente' | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const handleScroll = useCallback(() => {
    setIsAtTop((scrollRef.current?.scrollTop ?? 0) < 50);
  }, []);

  const contaNome = useMemo(
    () => (id: string) => contas?.find(c => c.id === id)?.nome ?? '—',
    [contas],
  );

  const filtered = useMemo(() =>
    (financiamentos ?? []).filter(f =>
      f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contaNome(f.contaId).toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [financiamentos, searchTerm, contaNome],
  );

  const handleEliminar = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await api.financiamentos.eliminar(id);
      toast('Financiamento eliminado');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

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
        periodicidade: form.periodicidade,
        dataPrimeiraParcela: form.dataPrimeiraParcela,
        creditarConta: createMode === 'novo',
      });
      toast(createMode === 'novo'
        ? 'Financiamento registado. Valor creditado na conta.'
        : 'Financiamento registado. Saldo da conta não foi alterado.');
      setCreateMode(null);
      setForm(emptyForm());
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  let content: React.ReactElement;
  if (error) {
    content = <div className="p-6 text-center text-red-600 text-sm">{error}</div>;
  } else if (loading) {
    content = (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 h-52 animate-pulse" />
        ))}
      </div>
    );
  } else if (filtered.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center h-full min-h-48 text-center">
        <Building2 className="w-10 h-10 text-slate-200 mb-3" />
        <p className="text-sm font-medium text-slate-500">
          {(financiamentos ?? []).length === 0 ? 'Nenhum financiamento registado' : 'Nenhum resultado'}
        </p>
        {(financiamentos ?? []).length === 0 && (
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setCreateMode('novo')}>
            <Plus className="w-4 h-4 mr-1" />Registar financiamento
          </Button>
        )}
      </div>
    );
  } else {
    content = (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(f => (
          <FinanciamentoCard key={f.id} f={f} contaNome={contaNome(f.contaId)} onEliminar={() => setDeleteId(f.id)} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="px-4 md:px-5 pt-4 bg-white border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-slate-900">Financiamentos</h2>
            {!loading && (
              <p className="text-xs text-slate-400 mt-0.5">
                {filtered.length} {filtered.length === 1 ? 'financiamento' : 'financiamentos'}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setCreateMode('existente')}>
              <Plus className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Adicionar Existente</span>
            </Button>
            <Button size="sm" onClick={() => setCreateMode('novo')} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Novo Financiamento</span>
            </Button>
          </div>
        </div>
        <div className={`overflow-hidden transition-all duration-200 ${isAtTop ? 'max-h-16 opacity-100 pb-4' : 'max-h-0 opacity-0 pb-0'}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
            <Input
              aria-label="Pesquisar financiamentos"
              placeholder="Pesquisar por nome ou conta..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-9 border-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto p-4 md:p-5">
        {content}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={open => { if (!open) setDeleteId(null); }}
        title="Eliminar financiamento"
        description="Tem a certeza que deseja eliminar este financiamento? Esta ação é irreversível."
        confirmLabel="Eliminar"
        onConfirm={handleEliminar}
      />

      {/* Create dialog */}
      <Dialog open={createMode !== null} onOpenChange={open => { if (!open) { setCreateMode(null); setForm(emptyForm()); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{createMode === 'existente' ? 'Adicionar Financiamento Existente' : 'Novo Financiamento'}</DialogTitle>
            <DialogDescription>
              {createMode === 'existente'
                ? ''
                : 'O valor será creditado imediatamente na conta selecionada e uma despesa periódica será criada automaticamente.'}
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
                    {(Object.keys(PERIODICIDADE_LABELS) as Periodicidade[]).map(per => (
                      <SelectItem key={per} value={per}>{PERIODICIDADE_LABELS[per]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cf-dataPrimeira" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data Primeira Parcela *</Label>
                <Input
                  id="cf-dataPrimeira"
                  type="date"
                  value={form.dataPrimeiraParcela}
                  onChange={e => setForm(f => ({ ...f, dataPrimeiraParcela: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>

            {form.valor && form.valorPrestacao && Number(form.valor) > 0 && Number(form.valorPrestacao) > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5 text-xs text-indigo-700">
                Duração estimada: ~{Math.ceil(Number(form.valor) / Number(form.valorPrestacao))} {form.periodicidade ? PERIODICIDADE_LABELS[form.periodicidade].toLowerCase() + 's' : 'períodos'}
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
              <Button variant="outline" onClick={() => { setCreateMode(null); setForm(emptyForm()); }}>Cancelar</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCreate} disabled={saving}>
                {saving ? 'A guardar...' : createMode === 'existente' ? 'Adicionar Financiamento' : 'Registar Financiamento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
