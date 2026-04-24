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
import type { ColaboradorDto, ReceitaDto } from '@/lib/types';

// ── Form types ─────────────────────────────────────────────────────────────────

interface ReceitaForm {
  nome: string;
  contaId: string;
  valorTotal: string;
  categoria: string;
  colaboradorId: string;
  temIva: boolean;
  parcelas: { dataVencimento: string; percentagem: string }[];
}

const emptyForm = (contaId = ''): ReceitaForm => ({
  nome: '',
  contaId,
  valorTotal: '',
  categoria: '',
  colaboradorId: '',
  temIva: false,
  parcelas: [{ dataVencimento: '', percentagem: '100' }],
});

const receitaToForm = (r: ReceitaDto): ReceitaForm => ({
  nome: r.nome,
  contaId: r.contaId,
  valorTotal: String(r.valorTotal),
  categoria: r.categoria ?? '',
  colaboradorId: r.colaboradorId ?? '',
  parcelas: r.parcelas
    .filter(p => !p.isPaid)
    .sort((a, b) => a.numero - b.numero)
    .map(p => ({
      dataVencimento: p.dataVencimento,
      percentagem: p.percentagem != null ? String(p.percentagem) : '',
    })),
});

function parcelaValorBruto(valorTotal: string, pct: string): string {
  const vt = parseFloat(valorTotal);
  const p = parseFloat(pct);
  if (!vt || !p) return '—';
  return `€${((vt * p) / 100).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
}

// ── Component ──────────────────────────────────────────────────────────────────

interface ReceitaViewProps {
  highlightId?: string;
  onHighlightConsumed?: () => void;
}

export function ReceitaView({ highlightId, onHighlightConsumed }: ReceitaViewProps = {}) {
  const toast = useToast();
  const { data: receitas, loading, error, reload } = useAsync(() => api.receitas.listar(), []);
  const { data: contas } = useAsync(() => api.contas.listar(), []);
  const { data: colaboradores } = useAsync(() => api.colaboradores.listar(), []);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingReceita = useMemo(
    () => editingId ? (receitas ?? []).find(r => r.id === editingId) ?? null : null,
    [receitas, editingId],
  );

  useEffect(() => {
    if (highlightId && receitas) {
      const match = receitas.find(r => r.id === highlightId);
      if (match) {
        setExpandedId(match.id);
        onHighlightConsumed?.();
      }
    }
  }, [highlightId, receitas]);

  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const handleScroll = useCallback(() => {
    setIsAtTop((scrollRef.current?.scrollTop ?? 0) < 50);
  }, []);

  const {
    liquidando, liquidarDialog, setLiquidarDialog, estornando,
    estornarConfirmId, setEstornarConfirmId,
    openLiquidarDialog, parcelaSort, toggleSort, handleLiquidar, handleEstornar,
  } = useParcelaActions(reload);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<ReceitaForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() =>
    (receitas ?? [])
      .filter(r => !removingIds.has(r.id))
      .filter(r =>
        r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      ),
    [receitas, searchTerm, removingIds],
  );

  const { page, totalPages, pageItems, setPage, reset: resetPage } = usePagination(filtered, 15);
  useEffect(() => { resetPage(); }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const valorTotal = (r: ReceitaDto) => r.parcelas.reduce((s, p) => s + p.valorBruto, 0);

  const addParcela = () =>
    setForm(f => ({ ...f, parcelas: [...f.parcelas, { dataVencimento: '', percentagem: '' }] }));

  const removeParcela = (i: number) =>
    setForm(f => {
      const next = f.parcelas.filter((_, idx) => idx !== i);
      if (next.length === 1) return { ...f, parcelas: [{ ...next[0], percentagem: '100' }] };
      return { ...f, parcelas: next };
    });

  const updateParcela = (i: number, field: keyof ReceitaForm['parcelas'][0], value: string) =>
    setForm(f => ({ ...f, parcelas: f.parcelas.map((p, idx) => idx === i ? { ...p, [field]: value } : p) }));

  const totalPercentagem = useMemo(
    () => form.parcelas.reduce((s, p) => s + (parseFloat(p.percentagem) || 0), 0),
    [form.parcelas],
  );

  // ── Actions ──────────────────────────────────────────────────────────────────

  const openEdit = (r: ReceitaDto, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(r.id);
    setForm(receitaToForm(r));
    setEditOpen(true);
  };

  const validateForm = () => {
    if (!form.nome.trim()) { toast('Nome obrigatório', 'error'); return false; }
    if (!form.contaId) { toast('Selecione uma conta', 'error'); return false; }
    if (!form.valorTotal || parseFloat(form.valorTotal) <= 0) { toast('Valor total deve ser positivo', 'error'); return false; }
    if (form.parcelas.length === 0) { toast('Adicione pelo menos uma parcela', 'error'); return false; }
    if (form.parcelas.some(p => !p.dataVencimento || !p.percentagem)) { toast('Preencha todas as parcelas', 'error'); return false; }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      await api.receitas.criar({
        nome: form.nome.trim(),
        contaId: form.contaId,
        valorTotal: parseFloat(form.valorTotal),
        categoria: form.categoria.trim() || undefined,
        colaboradorId: form.colaboradorId || undefined,
        temIva: form.temIva,
        parcelas: form.parcelas.map((p, i) => ({
          numero: i + 1,
          dataVencimento: p.dataVencimento,
          percentagem: parseFloat(p.percentagem),
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
        valorTotal: parseFloat(form.valorTotal),
        categoria: form.categoria.trim() || undefined,
        colaboradorId: form.colaboradorId || undefined,
        parcelas: form.parcelas.map((p, i) => ({
          numero: i + 1,
          dataVencimento: p.dataVencimento,
          percentagem: parseFloat(p.percentagem),
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

  const handleRemove = async () => {
    if (!removeId) return;
    const id = removeId;
    setRemovingIds(prev => new Set(prev).add(id));
    setRemoveId(null);
    if (expandedId === id) setExpandedId(null);
    try {
      await api.receitas.remover(id);
      toast('Receita removida');
      reload();
    } catch (e) {
      setRemovingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      toast((e as Error).message, 'error');
    }
  };

  // ── Form dialog (shared create / edit) ────────────────────────────────────────

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
                : 'Defina o valor total e distribua-o em parcelas por percentagem.'}
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
                <Label htmlFor="rf-vt" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">VALOR TOTAL (€) *</Label>
                <div className="relative mt-1.5">
                  <Input id="rf-vt" type="number" value={form.valorTotal} onChange={e => setForm(f => ({ ...f, valorTotal: e.target.value }))} step="0.01" min="0" placeholder="0.00" className="pl-6" />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                </div>
              </div>
              <div>
                <Label htmlFor="rf-cat" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">CATEGORIA</Label>
                <Input id="rf-cat" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="mt-1.5" placeholder="Ex: Consultoria" />
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
                      {form.temIva && form.valorTotal && parseFloat(form.valorTotal) > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          — despesa de IVA criada automaticamente: €{(parseFloat(form.valorTotal) * 0.23).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">PARCELAS *</Label>
                  <span className={`text-xs font-medium ${Math.abs(totalPercentagem - 100) < 0.01 ? 'text-green-600' : totalPercentagem > 100 ? 'text-red-600' : 'text-gray-500'}`}>
                    {totalPercentagem.toFixed(1)}% / 100%
                  </span>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addParcela}><Plus className="w-3.5 h-3.5 mr-1" />Adicionar</Button>
              </div>
              <div className="space-y-2">
                {form.parcelas.map((p, i) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_90px_auto] gap-2 items-end">
                    <div>
                      <label className="text-xs text-gray-500">Vencimento</label>
                      <input type="date" value={p.dataVencimento} onChange={e => updateParcela(i, 'dataVencimento', e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Percentagem (%)</label>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          value={p.percentagem}
                          onChange={e => updateParcela(i, 'percentagem', e.target.value)}
                          step="0.1" min="0" max="100" placeholder="0"
                          className="pr-6"
                          disabled={form.parcelas.length === 1}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Valor</label>
                      <p className="mt-1 h-9 flex items-center text-sm font-medium text-green-600">
                        {parcelaValorBruto(form.valorTotal, p.percentagem)}
                      </p>
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

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-5 pt-3.5 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base md:text-lg font-semibold text-slate-900">Receitas</h2>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setForm(emptyForm()); setCreateOpen(true); }}>
            <Plus className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Nova Receita</span>
          </Button>
        </div>
        <div className={`overflow-hidden transition-all duration-200 ${isAtTop ? 'max-h-16 opacity-100 pb-3.5' : 'max-h-0 opacity-0 pb-0'}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
            <Input aria-label="Pesquisar receitas" placeholder="Pesquisar por nome ou categoria..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 border-slate-200" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto bg-white">
        {error ? (
          <div className="p-6 text-center text-red-600 text-sm">{error}</div>
        ) : loading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />)}</div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-slate-50 z-10">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</TableHead>
                <TableHead className="w-36 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Categoria</TableHead>
                <TableHead className="w-28 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor Total</TableHead>
                <TableHead className="w-28 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Atualizado</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-gray-500 py-8">
                    {(receitas ?? []).length === 0 ? 'Nenhuma receita registada' : 'Nenhum resultado'}
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map(r => (
                  <Fragment key={r.id}>
                    <TableRow
                      className={`cursor-pointer select-none transition-colors ${expandedId === r.id ? 'bg-indigo-50/50 hover:bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                      onClick={() => setExpandedId(id => id === r.id ? null : r.id)}
                    >
                      <TableCell className="font-medium">
                        {r.nome}
                        {r.colaboradorNome && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                            {r.colaboradorNome}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 hidden sm:table-cell">
                        {r.categoria
                          ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{r.categoria}</span>
                          : <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600 tabular-nums">
                        €{valorTotal(r).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 hidden sm:table-cell">
                        {formatDateTime(r.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                            title="Editar"
                            onClick={e => openEdit(r, e)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-red-400 hover:bg-red-50 hover:text-red-700"
                            title="Remover"
                            onClick={e => { e.stopPropagation(); setRemoveId(r.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {expandedId === r.id && (
                      <TableRow className="hidden sm:table-row">
                        <TableCell colSpan={5} className="p-0">
                          <div className="px-4 md:px-8 py-4 bg-slate-50/60 border-t border-slate-100">
                            <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase mb-3">
                              Parcelas ({r.parcelas.length})
                            </p>
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                              <ParcelasTable
                                parcelas={r.parcelas}
                                variant="receita"
                                parcelaSort={parcelaSort}
                                toggleSort={toggleSort}
                                liquidando={liquidando}
                                estornando={estornando}
                                onLiquidar={(id, isRecorrente, contaId) => openLiquidarDialog(id, isRecorrente, contaId)}
                                onEstornar={setEstornarConfirmId}
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={15}
          onPageChange={setPage}
        />
      </div>

      {/* ── Mobile detail overlay ── */}
      {(() => {
        const r = expandedId ? (receitas ?? []).find(x => x.id === expandedId) ?? null : null;
        if (!r) return null;
        return (
          <div className="sm:hidden fixed inset-0 z-40 bg-white flex flex-col pb-16">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1" onClick={() => setExpandedId(null)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{r.nome}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {r.categoria && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{r.categoria}</span>
                  )}
                  {r.colaboradorNome && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                      {r.colaboradorNome}{r.percentagemComissao != null ? ` · ${r.percentagemComissao}%` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <ParcelasTable
                parcelas={r.parcelas}
                variant="receita"
                parcelaSort={parcelaSort}
                toggleSort={toggleSort}
                liquidando={liquidando}
                estornando={estornando}
                onLiquidar={(id, isRecorrente, contaId) => openLiquidarDialog(id, isRecorrente, contaId)}
                onEstornar={setEstornarConfirmId}
              />
            </div>
          </div>
        );
      })()}

      <LiquidarDialog
        dialog={liquidarDialog}
        contas={contas ?? []}
        onClose={() => setLiquidarDialog(null)}
        onDataChange={data => setLiquidarDialog(d => d ? { ...d, data } : null)}
        onValorRealChange={() => {}}
        onContaChange={contaId => setLiquidarDialog(d => d ? { ...d, contaId } : null)}
        onConfirm={handleLiquidar}
        variant="receita"
      />

      {renderFormDialog('create')}
      {renderFormDialog('edit')}

      <ConfirmDialog
        open={removeId !== null}
        onOpenChange={open => { if (!open) setRemoveId(null); }}
        title="Remover receita"
        description="A receita ficará marcada como removida e deixará de aparecer nas listas. Esta ação não reverte pagamentos já efetuados."
        confirmLabel="Remover"
        onConfirm={handleRemove}
      />

      <ConfirmDialog
        open={estornarConfirmId !== null}
        onOpenChange={open => { if (!open) setEstornarConfirmId(null); }}
        title="Estornar pagamento"
        description="Tem a certeza que deseja reverter a liquidação desta parcela? O saldo da conta será ajustado."
        confirmLabel="Estornar"
        onConfirm={handleEstornar}
      />

    </div>
  );
}
