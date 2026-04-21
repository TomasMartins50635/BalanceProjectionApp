import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LiquidarDialog } from '@/components/LiquidarDialog';
import { ParcelasTable } from '@/components/ParcelasTable';
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

// ── Parcela form row ───────────────────────────────────────────────────────────

function parcelaValorBruto(valorTotal: string, pct: string): string {
  const vt = parseFloat(valorTotal);
  const p = parseFloat(pct);
  if (!vt || !p) return '—';
  return `€${((vt * p) / 100).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
}

// ── Main component ─────────────────────────────────────────────────────────────

interface ReceitaViewProps {
  highlightId?: string;
  onHighlightConsumed?: () => void;
}

export function ReceitaView({ highlightId, onHighlightConsumed }: ReceitaViewProps = {}) {
  const toast = useToast();
  const { data: receitas, loading, error, reload } = useAsync(() => api.receitas.listar(), []);
  const { data: contas } = useAsync(() => api.contas.listar(), []);
  const { data: colaboradores } = useAsync(() => api.colaboradores.listar(), []);

  const [selectedReceita, setSelectedReceita] = useState<ReceitaDto | null>(null);

  useEffect(() => {
    if (highlightId && receitas) {
      const match = receitas.find(r => r.id === highlightId) ?? null;
      if (match) {
        setSelectedReceita(match);
        onHighlightConsumed?.();
      }
    }
  }, [highlightId, receitas]);
  const [searchTerm, setSearchTerm] = useState('');
  const {
    liquidando, liquidarDialog, setLiquidarDialog, estornando,
    estornarConfirmId, setEstornarConfirmId,
    openLiquidarDialog, parcelaSort, toggleSort, handleLiquidar, handleEstornar,
  } = useParcelaActions(reload);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(() => localStorage.getItem('banner_receita') === '1');

  const dismissBanner = () => { localStorage.setItem('banner_receita', '1'); setBannerDismissed(true); };

  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<ReceitaForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const liveSelectedReceita = useMemo(
    () => selectedReceita ? (receitas ?? []).find(r => r.id === selectedReceita.id) ?? null : null,
    [receitas, selectedReceita],
  );

  const filtered = useMemo(() =>
    (receitas ?? [])
      .filter(r => !removingIds.has(r.id))
      .filter(r =>
        r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      ),
    [receitas, searchTerm, removingIds],
  );

  const contaNome = useMemo(
    () => (id: string) => contas?.find(c => c.id === id)?.nome ?? id,
    [contas],
  );

  // ── Parcela helpers ──
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
    if (!validateForm()) return;
    setSaving(true);
    try {
      await api.receitas.atualizar(selectedReceita!.id, {
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
    // Remoção otimista — desaparece imediatamente da lista
    setRemovingIds(prev => new Set(prev).add(id));
    setRemoveId(null);
    if (selectedReceita?.id === id) setSelectedReceita(null);
    try {
      await api.receitas.remover(id);
      toast('Receita removida');
      reload();
    } catch (e) {
      // Rollback — repõe o item na lista
      setRemovingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      toast((e as Error).message, 'error');
    }
  };

  // ── Form dialog JSX (shared between create and edit) ──────────────────────────

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
            {/* Nome + Conta */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="rf-nome" className="text-xs font-medium text-gray-700">NOME *</Label>
                <Input id="rf-nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="mt-1.5" placeholder="Ex: Projeto ABC" />
              </div>
              {!isEdit && (
                <div>
                  <Label htmlFor="rf-conta" className="text-xs font-medium text-gray-700">CONTA *</Label>
                  <Select value={form.contaId} onValueChange={v => setForm(f => ({ ...f, contaId: v }))}>
                    <SelectTrigger id="rf-conta" className="mt-1.5"><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
                    <SelectContent>
                      {(contas ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* ValorTotal */}
              <div>
                <Label htmlFor="rf-vt" className="text-xs font-medium text-gray-700">VALOR TOTAL (€) *</Label>
                <div className="relative mt-1.5">
                  <Input id="rf-vt" type="number" value={form.valorTotal} onChange={e => setForm(f => ({ ...f, valorTotal: e.target.value }))} step="0.01" min="0" placeholder="0.00" className="pl-6" />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                </div>
              </div>
              {/* Categoria livre */}
              <div>
                <Label htmlFor="rf-cat" className="text-xs font-medium text-gray-700">CATEGORIA</Label>
                <Input id="rf-cat" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="mt-1.5" placeholder="Ex: Consultoria" />
              </div>
              {/* Colaborador */}
              <div>
                <Label htmlFor="rf-col" className="text-xs font-medium text-gray-700">COLABORADOR</Label>
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
              {/* IVA — only shown on create */}
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

            {/* Parcelas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-medium text-gray-700">PARCELAS *</Label>
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
                      <input type="date" value={p.dataVencimento} onChange={e => updateParcela(i, 'dataVencimento', e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
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
                      <Button type="button" size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 mb-0.5" onClick={() => removeParcela(i)} aria-label={`Remover parcela ${i + 1}`}>✕</Button>
                    )}
                  </div>
                ))}
              </div>
              {isEdit && liveSelectedReceita && liveSelectedReceita.parcelas.some(p => p.isPaid) && (
                <div className="flex items-start justify-between gap-2 mt-2 bg-amber-50 border border-amber-200 rounded p-2">
                  <p className="text-xs text-amber-600">
                    {liveSelectedReceita.parcelas.filter(p => p.isPaid).length} parcela(s) já liquidada(s) serão mantidas e não podem ser editadas.
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
    <div className="flex flex-col md:flex-row h-full">
      {/* ── Left panel ── */}
      <div className="w-full md:w-[480px] border-b md:border-b-0 md:border-r border-gray-200 bg-white flex flex-col max-h-[40vh] md:max-h-none">
        <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Receitas / Faturação</h2>
            <Button size="sm" onClick={() => { setForm(emptyForm()); setCreateOpen(true); }}>
              <Plus className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Nova Receita</span>
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <Input aria-label="Pesquisar receitas" placeholder="Pesquisar por nome ou categoria..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9" />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {error ? (
            <div className="p-6 text-center text-red-600 text-sm">{error}</div>
          ) : loading ? (
            <div className="p-6 space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}</div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-gray-50 z-10">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-32 text-right">Valor Total</TableHead>
                  <TableHead className="w-28">Categoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-gray-500 py-8">
                      {(receitas ?? []).length === 0 ? 'Nenhuma receita registada' : 'Nenhum resultado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(r => (
                    <TableRow key={r.id} className={`cursor-pointer ${liveSelectedReceita?.id === r.id ? 'bg-blue-50' : ''}`} onClick={() => setSelectedReceita(r)}>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        €{r.valorTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {r.categoria ?? '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 bg-gray-50 overflow-auto">
        {liveSelectedReceita ? (
          <div className="p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{liveSelectedReceita.nome}</h3>
                {liveSelectedReceita.categoria && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 mt-1">
                    {liveSelectedReceita.categoria}
                  </span>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => { setForm(receitaToForm(liveSelectedReceita)); setEditOpen(true); }}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />Editar
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setRemoveId(liveSelectedReceita.id)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />Remover
                </Button>
              </div>
            </div>

            {!bannerDismissed && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 flex items-start justify-between gap-2">
                <p className="text-sm text-green-800">Parcelas liquidadas <strong>creditam</strong> o saldo da conta (ValorLíquido após comissão)</p>
                <button onClick={dismissBanner} className="shrink-0 text-green-500 hover:text-green-700" aria-label="Fechar aviso">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <Tabs defaultValue="geral" className="space-y-4">
              <TabsList>
                <TabsTrigger value="geral">Informação Geral</TabsTrigger>
                <TabsTrigger value="parcelas">Parcelas ({liveSelectedReceita.parcelas.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="geral" className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500">CONTA</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{contaNome(liveSelectedReceita.contaId)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">CATEGORIA</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{liveSelectedReceita.categoria ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">VALOR TOTAL</p>
                      <p className="text-sm font-semibold text-green-600 mt-1">
                        €{liveSelectedReceita.valorTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">VALOR LÍQUIDO TOTAL</p>
                      <p className="text-sm font-semibold text-green-600 mt-1">
                        €{liveSelectedReceita.parcelas.reduce((s, p) => s + p.valorLiquido, 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  {liveSelectedReceita.colaboradorNome && (
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-1">COLABORADOR</p>
                      <p className="text-sm text-gray-700">
                        {liveSelectedReceita.colaboradorNome}
                        {liveSelectedReceita.percentagemComissao != null && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            {liveSelectedReceita.percentagemComissao}% comissão
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="parcelas">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900">PARCELAS</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Liquide cada parcela para creditar o saldo da conta</p>
                  </div>
                  <ParcelasTable
                    parcelas={liveSelectedReceita.parcelas}
                    variant="receita"
                    parcelaSort={parcelaSort}
                    toggleSort={toggleSort}
                    liquidando={liquidando}
                    estornando={estornando}
                    onLiquidar={openLiquidarDialog}
                    onEstornar={setEstornarConfirmId}
                  />
                </div>
              </TabsContent>

            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">Selecione uma receita para ver os detalhes</p>
          </div>
        )}
      </div>

      <LiquidarDialog
        dialog={liquidarDialog}
        onClose={() => setLiquidarDialog(null)}
        onDataChange={data => setLiquidarDialog(d => d ? { ...d, data } : null)}
        onValorRealChange={() => {}}
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
