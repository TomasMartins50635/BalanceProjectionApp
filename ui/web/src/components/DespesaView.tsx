import { Fragment, useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, ChevronRight } from 'lucide-react';
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
  CATEGORIAS, CATEGORIA_LABELS, type CategoriaContrato, type DespesaDto,
  type TipoDespesa, type Periodicidade,
  PERIODICIDADE_LABELS,
} from '@/lib/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

const TIPO_BADGE: Record<TipoDespesa, { label: string; className: string }> = {
  Pontual:    { label: 'Pontual',    className: 'bg-gray-100 text-gray-700' },
  Fixa:       { label: 'Fixa',       className: 'bg-blue-100 text-blue-700' },
  Recorrente: { label: 'Recorrente', className: 'bg-purple-100 text-purple-700' },
};

// ── Create form ────────────────────────────────────────────────────────────────

interface CreateForm {
  nome: string;
  contaId: string;
  categoria: CategoriaContrato | '';
  tipoDespesa: TipoDespesa;
  parcelas: { dataVencimento: string; valorBruto: string }[];
  valorFixo: string;
  periodicidade: Periodicidade | '';
  dataInicio: string;
}

const emptyForm = (): CreateForm => ({
  nome: '',
  contaId: '',
  categoria: '',
  tipoDespesa: 'Pontual',
  parcelas: [{ dataVencimento: '', valorBruto: '' }],
  valorFixo: '',
  periodicidade: '',
  dataInicio: '',
});

// ── Component ──────────────────────────────────────────────────────────────────

interface DespesaViewProps {
  highlightId?: string;
  onHighlightConsumed?: () => void;
}

export function DespesaView({ highlightId, onHighlightConsumed }: DespesaViewProps = {}) {
  const toast = useToast();
  const { data: despesas, loading, error, reload } = useAsync(() => api.despesas.listar(), []);
  const { data: contas } = useAsync(() => api.contas.listar(), []);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const expandedDespesa = useMemo(
    () => expandedId ? (despesas ?? []).find(d => d.id === expandedId) ?? null : null,
    [despesas, expandedId],
  );

  useEffect(() => {
    if (highlightId && despesas) {
      const match = despesas.find(d => d.id === highlightId);
      if (match) {
        setExpandedId(match.id);
        onHighlightConsumed?.();
      }
    }
  }, [highlightId, despesas]);

  const [searchTerm, setSearchTerm] = useState('');
  const {
    liquidando, liquidarDialog, setLiquidarDialog, estornando,
    estornarConfirmId, setEstornarConfirmId,
    openLiquidarDialog, parcelaSort, toggleSort, handleLiquidar, handleEstornar,
  } = useParcelaActions(reload);
  const [removendoParcela, setRemovendoParcela] = useState<string | null>(null);
  const [removeParcelaId, setRemoveParcelaId] = useState<string | null>(null);
  const [alterarContaDialog, setAlterarContaDialog] = useState<{ parcelaId: string; contaId: string } | null>(null);
  const [alterandoConta, setAlterandoConta] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addParcelaOpen, setAddParcelaOpen] = useState(false);
  const [addParcelaForm, setAddParcelaForm] = useState({ dataVencimento: '', valorBruto: '' });
  const [addParcelaSaving, setAddParcelaSaving] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() =>
    (despesas ?? []).filter(d =>
      d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.categoria && CATEGORIA_LABELS[d.categoria].toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    [despesas, searchTerm],
  );

  const valorTotal = (d: DespesaDto) => d.parcelas.reduce((s, p) => s + p.valorBruto, 0);

  const despesaToForm = (d: DespesaDto): CreateForm => ({
    nome: d.nome,
    contaId: d.contaId,
    categoria: d.categoria ?? '',
    tipoDespesa: d.tipoDespesa,
    parcelas: d.parcelas
      .filter(p => !p.isPaid)
      .sort((a, b) => a.numero - b.numero)
      .map(p => ({ dataVencimento: p.dataVencimento, valorBruto: String(p.valorBruto) })),
    valorFixo: d.valorFixo != null ? String(d.valorFixo) : '',
    periodicidade: d.periodicidade ?? '',
    dataInicio: d.dataInicio ?? '',
  });

  const openEdit = (d: DespesaDto, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(d.id);
    setForm(despesaToForm(d));
    setEditOpen(true);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleAlterarConta = async () => {
    if (!alterarContaDialog) return;
    const { parcelaId, contaId } = alterarContaDialog;
    setAlterarContaDialog(null);
    setAlterandoConta(true);
    try {
      await api.parcelas.alterarConta(parcelaId, contaId);
      toast('Conta alterada');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setAlterandoConta(false);
    }
  };

  const handleRemoverParcela = async () => {
    if (!removeParcelaId) return;
    const id = removeParcelaId;
    setRemoveParcelaId(null);
    setRemovendoParcela(id);
    try {
      await api.parcelas.remover(id);
      toast('Parcela eliminada');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setRemovendoParcela(null);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      if (form.tipoDespesa === 'Fixa') {
        if (!form.nome.trim() || !form.contaId || !form.valorFixo || !form.periodicidade || !form.dataInicio) {
          toast('Preencha todos os campos obrigatórios', 'error');
          return;
        }
        await api.despesas.criar({
          nome: form.nome.trim(),
          contaId: form.contaId,
          categoria: form.categoria || undefined,
          tipoDespesa: 'Fixa',
          valorFixo: parseFloat(form.valorFixo),
          periodicidade: form.periodicidade as Periodicidade,
          dataInicio: form.dataInicio,
        });
      } else if (form.tipoDespesa === 'Recorrente') {
        if (!form.nome.trim() || !form.contaId || !form.valorFixo || !form.dataInicio) {
          toast('Preencha todos os campos obrigatórios', 'error');
          return;
        }
        await api.despesas.criar({
          nome: form.nome.trim(),
          contaId: form.contaId,
          categoria: form.categoria || undefined,
          tipoDespesa: 'Recorrente',
          valorFixo: Number.parseFloat(form.valorFixo),
          dataInicio: form.dataInicio,
        });
      } else {
        if (!form.nome.trim() || !form.contaId || form.parcelas.some(p => !p.dataVencimento || !p.valorBruto)) {
          toast('Preencha todos os campos obrigatórios', 'error');
          return;
        }
        await api.despesas.criar({
          nome: form.nome.trim(),
          contaId: form.contaId,
          categoria: form.categoria || undefined,
          tipoDespesa: form.tipoDespesa,
          parcelas: form.parcelas.map((p, i) => ({
            numero: i + 1,
            dataVencimento: p.dataVencimento,
            valorBruto: parseFloat(p.valorBruto),
          })),
        });
      }
      toast('Despesa criada com sucesso');
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
    if (!editingId) return;
    if (!form.nome.trim()) { toast('Nome obrigatório', 'error'); return; }
    setSaving(true);
    try {
      await api.despesas.atualizar(editingId, {
        nome: form.nome.trim(),
        categoria: form.categoria || undefined,
      });
      toast('Despesa atualizada com sucesso');
      setEditOpen(false);
      setForm(emptyForm());
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
    setRemoveId(null);
    if (expandedId === id) setExpandedId(null);
    try {
      await api.despesas.remover(id);
      toast('Despesa removida');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const handleToggleEstado = async () => {
    if (!expandedDespesa) return;
    setToggling(true);
    try {
      await api.despesas.toggleEstado(expandedDespesa.id, !expandedDespesa.isActive);
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setToggling(false);
    }
  };

  const handleAddParcela = async () => {
    if (!expandedDespesa) return;
    if (!addParcelaForm.dataVencimento || !addParcelaForm.valorBruto) {
      toast('Preencha a data de vencimento e o valor', 'error');
      return;
    }
    setAddParcelaSaving(true);
    try {
      await api.despesas.adicionarParcela(expandedDespesa.id, {
        dataVencimento: addParcelaForm.dataVencimento,
        valorBruto: parseFloat(addParcelaForm.valorBruto),
      });
      toast('Parcela adicionada');
      setAddParcelaOpen(false);
      setAddParcelaForm({ dataVencimento: '', valorBruto: '' });
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setAddParcelaSaving(false);
    }
  };

  const addParcela = () =>
    setForm(f => ({ ...f, parcelas: [...f.parcelas, { dataVencimento: '', valorBruto: '' }] }));

  const removeParcela = (i: number) =>
    setForm(f => ({ ...f, parcelas: f.parcelas.filter((_, idx) => idx !== i) }));

  const updateParcela = (i: number, field: keyof CreateForm['parcelas'][0], value: string) =>
    setForm(f => ({ ...f, parcelas: f.parcelas.map((p, idx) => idx === i ? { ...p, [field]: value } : p) }));

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base md:text-lg font-semibold text-gray-900">Despesas</h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Nova Despesa</span>
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <Input
            aria-label="Pesquisar despesas"
            placeholder="Pesquisar por nome ou categoria..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        {error ? (
          <div className="p-6 text-center text-red-600 text-sm">{error}</div>
        ) : loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-gray-50 z-10">
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Nome</TableHead>
                <TableHead className="w-28">Tipo</TableHead>
                <TableHead className="w-36">Categoria</TableHead>
                <TableHead className="w-28 text-right">Valor Total</TableHead>
                <TableHead className="w-28">Atualizado</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-gray-500 py-8">
                    {(despesas ?? []).length === 0 ? 'Nenhuma despesa registada' : 'Nenhum resultado'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(d => (
                  <Fragment key={d.id}>
                    <TableRow
                      className={`cursor-pointer select-none transition-colors ${expandedId === d.id ? 'bg-blue-50 hover:bg-blue-50' : 'hover:bg-gray-50'}`}
                      onClick={() => setExpandedId(id => id === d.id ? null : d.id)}
                    >
                      <TableCell className="px-3">
                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${expandedId === d.id ? 'rotate-90' : ''}`} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {d.nome}
                        {d.tipoDespesa !== 'Pontual' && (
                          <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {d.isActive ? 'Ativa' : 'Inativa'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TIPO_BADGE[d.tipoDespesa].className}`}>
                          {TIPO_BADGE[d.tipoDespesa].label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {d.categoria ? CATEGORIA_LABELS[d.categoria] : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        €{valorTotal(d).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDateTime(d.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                          {d.categoria !== 'IVA' && (
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                              title="Editar"
                              onClick={e => openEdit(d, e)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-red-400 hover:bg-red-50 hover:text-red-700"
                            title="Remover"
                            onClick={e => { e.stopPropagation(); setRemoveId(d.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {expandedId === d.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="p-0">
                          <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-semibold text-gray-500 tracking-wide">
                                PARCELAS ({d.parcelas.length})
                              </p>
                              <div className="flex gap-2">
                                {d.tipoDespesa !== 'Pontual' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={toggling}
                                    onClick={handleToggleEstado}
                                    className={d.isActive
                                      ? 'text-amber-600 border-amber-300 hover:bg-amber-50'
                                      : 'text-green-600 border-green-300 hover:bg-green-50'}
                                  >
                                    {d.isActive ? 'Desativar' : 'Ativar'}
                                  </Button>
                                )}
                                {d.categoria !== 'IVA' && (
                                  <Button size="sm" variant="outline" onClick={() => setAddParcelaOpen(true)}>
                                    <Plus className="w-3.5 h-3.5 mr-1" />Parcela
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <LiquidarDialog
        dialog={liquidarDialog}
        contas={contas ?? []}
        onClose={() => setLiquidarDialog(null)}
        onDataChange={data => setLiquidarDialog(d => d ? { ...d, data } : null)}
        onValorRealChange={valorReal => setLiquidarDialog(d => d ? { ...d, valorReal } : null)}
        onContaChange={contaId => setLiquidarDialog(d => d ? { ...d, contaId } : null)}
        onConfirm={handleLiquidar}
        variant="despesa"
      />

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) setForm(emptyForm()); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
            <DialogDescription>Preencha os dados da despesa</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="cd-nome" className="text-xs font-medium text-gray-700">NOME *</Label>
                <Input id="cd-nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="mt-1.5" placeholder="Ex: Renda do escritório" />
              </div>
              <div>
                <Label htmlFor="cd-conta" className="text-xs font-medium text-gray-700">CONTA *</Label>
                <Select value={form.contaId} onValueChange={v => setForm(f => ({ ...f, contaId: v }))}>
                  <SelectTrigger id="cd-conta" className="mt-1.5"><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
                  <SelectContent>
                    {(contas ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cd-cat" className="text-xs font-medium text-gray-700">CATEGORIA</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v as CategoriaContrato }))}>
                  <SelectTrigger id="cd-cat" className="mt-1.5"><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700">TIPO DE DESPESA *</Label>
              <div className="flex gap-2 mt-1.5">
                {(['Pontual', 'Recorrente', 'Fixa'] as TipoDespesa[]).map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, tipoDespesa: tipo }))}
                    className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                      form.tipoDespesa === tipo
                        ? `border-transparent ${TIPO_BADGE[tipo].className}`
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {TIPO_BADGE[tipo].label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                {form.tipoDespesa === 'Pontual' && 'Uma ou mais parcelas avulsas, sem repetição.'}
                {form.tipoDespesa === 'Recorrente' && 'Repete-se mensalmente com valor variável no momento da liquidação.'}
                {form.tipoDespesa === 'Fixa' && 'Valor e periodicidade fixos — a próxima parcela é gerada automaticamente.'}
              </p>
            </div>

            {form.tipoDespesa !== 'Pontual' && (
              <div className="grid grid-cols-2 gap-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div>
                  <Label htmlFor="cd-valor-fixo" className="text-xs font-medium text-gray-700">
                    {form.tipoDespesa === 'Recorrente' ? 'VALOR PREVISTO (€) *' : 'VALOR FIXO (€) *'}
                  </Label>
                  <Input
                    id="cd-valor-fixo"
                    type="number" min="0" step="0.01" placeholder="0,00"
                    value={form.valorFixo}
                    onChange={e => setForm(f => ({ ...f, valorFixo: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
                {form.tipoDespesa === 'Fixa' && (
                  <div>
                    <Label htmlFor="cd-periodicidade" className="text-xs font-medium text-gray-700">PERIODICIDADE *</Label>
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
                <div>
                  <Label htmlFor="cd-data-inicio" className="text-xs font-medium text-gray-700">DATA DE INÍCIO *</Label>
                  <input
                    id="cd-data-inicio"
                    type="date"
                    value={form.dataInicio}
                    onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))}
                    className="mt-1.5 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {form.tipoDespesa === 'Pontual' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium text-gray-700">PARCELAS *</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addParcela}><Plus className="w-3.5 h-3.5 mr-1" />Adicionar</Button>
                </div>
                <div className="space-y-2">
                  {form.parcelas.map((p, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                      <div>
                        <label className="text-xs text-gray-500">Vencimento</label>
                        <input type="date" value={p.dataVencimento} onChange={e => updateParcela(i, 'dataVencimento', e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Valor (€)</label>
                        <Input type="number" value={p.valorBruto} onChange={e => updateParcela(i, 'valorBruto', e.target.value)} step="0.01" min="0" placeholder="0.00" className="mt-1" />
                      </div>
                      {form.parcelas.length > 1 && (
                        <Button type="button" size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 mb-0.5" onClick={() => removeParcela(i)}>✕</Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(emptyForm()); }}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving}>{saving ? 'A guardar...' : 'Criar Despesa'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={editOpen} onOpenChange={open => { setEditOpen(open); if (!open) setForm(emptyForm()); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
            <DialogDescription>Altere o nome ou a categoria da despesa.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="ed-nome" className="text-xs font-medium text-gray-700">NOME *</Label>
              <Input id="ed-nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="ed-cat" className="text-xs font-medium text-gray-700">CATEGORIA</Label>
              <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v as CategoriaContrato }))}>
                <SelectTrigger id="ed-cat" className="mt-1.5"><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setEditOpen(false); setForm(emptyForm()); }}>Cancelar</Button>
              <Button onClick={handleEdit} disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Adicionar parcela dialog ── */}
      <Dialog open={addParcelaOpen} onOpenChange={open => { setAddParcelaOpen(open); if (!open) setAddParcelaForm({ dataVencimento: '', valorBruto: '' }); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Parcela</DialogTitle>
            <DialogDescription>Nova parcela para {expandedDespesa?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="ap-data" className="text-xs font-medium text-gray-700">DATA DE VENCIMENTO *</Label>
              <input
                id="ap-data"
                type="date"
                value={addParcelaForm.dataVencimento}
                onChange={e => setAddParcelaForm(f => ({ ...f, dataVencimento: e.target.value }))}
                className="mt-1.5 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="ap-valor" className="text-xs font-medium text-gray-700">VALOR (€) *</Label>
              <div className="relative mt-1.5">
                <Input
                  id="ap-valor"
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={addParcelaForm.valorBruto}
                  onChange={e => setAddParcelaForm(f => ({ ...f, valorBruto: e.target.value }))}
                  className="pl-6"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setAddParcelaOpen(false); setAddParcelaForm({ dataVencimento: '', valorBruto: '' }); }}>Cancelar</Button>
              <Button onClick={handleAddParcela} disabled={addParcelaSaving}>
                {addParcelaSaving ? 'A guardar...' : 'Adicionar Parcela'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeId !== null}
        onOpenChange={open => { if (!open) setRemoveId(null); }}
        title="Remover despesa"
        description="Tem a certeza que deseja remover esta despesa? Todas as parcelas associadas serão eliminadas. Esta ação é irreversível."
        confirmLabel="Remover"
        onConfirm={handleRemove}
      />

      <ConfirmDialog
        open={removeParcelaId !== null}
        onOpenChange={open => { if (!open) setRemoveParcelaId(null); }}
        title="Eliminar parcela"
        description="Tem a certeza que deseja eliminar esta parcela? Esta ação é irreversível."
        confirmLabel="Eliminar"
        onConfirm={handleRemoverParcela}
      />

      <ConfirmDialog
        open={estornarConfirmId !== null}
        onOpenChange={open => { if (!open) setEstornarConfirmId(null); }}
        title="Estornar pagamento"
        description="Tem a certeza que deseja reverter a liquidação desta parcela? O saldo da conta será ajustado."
        confirmLabel="Estornar"
        onConfirm={handleEstornar}
      />

      {/* ── Alterar conta dialog ── */}
      <Dialog open={alterarContaDialog !== null} onOpenChange={open => { if (!open) setAlterarContaDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Conta</DialogTitle>
            <DialogDescription>Selecione a conta para esta parcela</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="ac-conta" className="text-xs font-medium text-gray-700">CONTA</Label>
              <Select
                value={alterarContaDialog?.contaId ?? ''}
                onValueChange={v => setAlterarContaDialog(d => d ? { ...d, contaId: v } : null)}
              >
                <SelectTrigger id="ac-conta" className="mt-1.5">
                  <SelectValue placeholder="Selecionar conta" />
                </SelectTrigger>
                <SelectContent>
                  {(contas ?? []).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                      <span className="ml-2 text-xs text-gray-400">
                        €{c.saldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAlterarContaDialog(null)}>Cancelar</Button>
              <Button
                disabled={!alterarContaDialog?.contaId || alterandoConta}
                onClick={handleAlterarConta}
              >
                {alterandoConta ? 'A guardar...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
