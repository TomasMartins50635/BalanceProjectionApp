import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Calendar, CheckCircle2, ArrowUp, ArrowDown, ChevronsUpDown, X, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatDate } from '@/lib/dates';
import { useToast } from '@/hooks/useToast';
import { useAsync } from '@/hooks/useAsync';
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
  // Pontual / Recorrente
  parcelas: { dataVencimento: string; valorBruto: string }[];
  // Fixa
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

  const [selectedDespesa, setSelectedDespesa] = useState<DespesaDto | null>(null);

  useEffect(() => {
    if (highlightId && despesas) {
      const match = despesas.find(d => d.id === highlightId) ?? null;
      if (match) {
        setSelectedDespesa(match);
        onHighlightConsumed?.();
      }
    }
  }, [highlightId, despesas]);

  const [searchTerm, setSearchTerm] = useState('');
  const [liquidando, setLiquidando] = useState<string | null>(null);
  const [liquidarDialog, setLiquidarDialog] = useState<{ parcelaId: string; data: string } | null>(null);
  const [estornando, setEstornando] = useState<string | null>(null);
  const [removendoParcela, setRemovendoParcela] = useState<string | null>(null);
  const [removeParcelaId, setRemoveParcelaId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => localStorage.getItem('banner_despesa') === '1');

  const dismissBanner = () => { localStorage.setItem('banner_despesa', '1'); setBannerDismissed(true); };

  type SortField = 'data' | 'valor';
  type SortDir = 'asc' | 'desc';
  const [parcelaSort, setParcelaSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'data', dir: 'asc' });

  const toggleSort = (field: SortField) =>
    setParcelaSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (parcelaSort.field !== field) return <ChevronsUpDown className="inline w-3.5 h-3.5 ml-1 text-gray-400" />;
    return parcelaSort.dir === 'asc'
      ? <ArrowUp className="inline w-3.5 h-3.5 ml-1 text-blue-500" />
      : <ArrowDown className="inline w-3.5 h-3.5 ml-1 text-blue-500" />;
  };

  const contaNome = useMemo(
    () => (id: string) => contas?.find(c => c.id === id)?.nome ?? id,
    [contas],
  );

  const filtered = useMemo(() =>
    (despesas ?? []).filter(d =>
      d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.categoria && CATEGORIA_LABELS[d.categoria].toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    [despesas, searchTerm],
  );

  const liveSelectedDespesa = useMemo(
    () => selectedDespesa ? (despesas ?? []).find(d => d.id === selectedDespesa.id) ?? null : null,
    [despesas, selectedDespesa],
  );

  const valorTotal = (d: DespesaDto) => d.parcelas.reduce((s, p) => s + p.valorBruto, 0);
  const valorPago = (d: DespesaDto) => d.parcelas.filter(p => p.isPaid).reduce((s, p) => s + p.valorLiquido, 0);

  const today = () => new Date().toISOString().slice(0, 10);

  const openLiquidarDialog = (parcelaId: string) =>
    setLiquidarDialog({ parcelaId, data: today() });

  const handleLiquidar = async () => {
    if (!liquidarDialog) return;
    setLiquidando(liquidarDialog.parcelaId);
    setLiquidarDialog(null);
    try {
      await api.parcelas.liquidar(liquidarDialog.parcelaId, liquidarDialog.data);
      toast('Parcela liquidada com sucesso');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLiquidando(null);
    }
  };

  const handleEstornar = async (parcelaId: string) => {
    setEstornando(parcelaId);
    try {
      await api.parcelas.estornar(parcelaId);
      toast('Liquidação revertida');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setEstornando(null);
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

  const handleEdit = async () => {
    if (!liveSelectedDespesa) return;
    setSaving(true);
    try {
      if (liveSelectedDespesa.tipoDespesa === 'Fixa') {
        if (!form.nome.trim() || !form.valorFixo) {
          toast('Preencha todos os campos obrigatórios', 'error');
          return;
        }
        await api.despesas.atualizar(liveSelectedDespesa.id, {
          nome: form.nome.trim(),
          categoria: form.categoria || undefined,
          valorFixo: parseFloat(form.valorFixo),
        });
      } else {
        if (!form.nome.trim() || form.parcelas.some(p => !p.dataVencimento || !p.valorBruto)) {
          toast('Preencha todos os campos obrigatórios', 'error');
          return;
        }
        await api.despesas.atualizar(liveSelectedDespesa.id, {
          nome: form.nome.trim(),
          categoria: form.categoria || undefined,
          parcelas: form.parcelas.map((p, i) => ({
            numero: i + 1,
            dataVencimento: p.dataVencimento,
            valorBruto: parseFloat(p.valorBruto),
          })),
        });
      }
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
    if (selectedDespesa?.id === id) setSelectedDespesa(null);
    try {
      await api.despesas.remover(id);
      toast('Despesa removida');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const handleToggleEstado = async () => {
    if (!liveSelectedDespesa) return;
    setToggling(true);
    try {
      await api.despesas.toggleEstado(liveSelectedDespesa.id, !liveSelectedDespesa.isActive);
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setToggling(false);
    }
  };

  const addParcela = () =>
    setForm(f => ({ ...f, parcelas: [...f.parcelas, { dataVencimento: '', valorBruto: '' }] }));

  const removeParcela = (i: number) =>
    setForm(f => ({ ...f, parcelas: f.parcelas.filter((_, idx) => idx !== i) }));

  const updateParcela = (i: number, field: keyof CreateForm['parcelas'][0], value: string) =>
    setForm(f => ({ ...f, parcelas: f.parcelas.map((p, idx) => idx === i ? { ...p, [field]: value } : p) }));

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* ── Left panel: list ── */}
      <div className="w-full md:w-[480px] border-b md:border-b-0 md:border-r border-gray-200 bg-white flex flex-col max-h-[40vh] md:max-h-none">
        <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-200">
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

        <div className="flex-1 overflow-auto">
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
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-28">Tipo</TableHead>
                  <TableHead className="w-32 text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-gray-500 py-8">
                      {(despesas ?? []).length === 0 ? 'Nenhuma despesa registada' : 'Nenhum resultado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(d => (
                    <TableRow
                      key={d.id}
                      className={`cursor-pointer ${liveSelectedDespesa?.id === d.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedDespesa(d)}
                    >
                      <TableCell className="font-medium">
                        {d.nome}
                        {d.tipoDespesa === 'Fixa' && (
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
                      <TableCell className="text-right font-semibold text-red-600">
                        €{valorTotal(d).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* ── Right panel: detail ── */}
      <div className="flex-1 bg-gray-50 overflow-auto">
        {liveSelectedDespesa ? (
          <div className="p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{liveSelectedDespesa.nome}</h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${TIPO_BADGE[liveSelectedDespesa.tipoDespesa].className}`}>
                    {TIPO_BADGE[liveSelectedDespesa.tipoDespesa].label}
                  </span>
                  {liveSelectedDespesa.categoria && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                      {CATEGORIA_LABELS[liveSelectedDespesa.categoria]}
                    </span>
                  )}
                  {liveSelectedDespesa.tipoDespesa === 'Fixa' && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${liveSelectedDespesa.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {liveSelectedDespesa.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {liveSelectedDespesa.tipoDespesa === 'Fixa' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={toggling}
                    onClick={handleToggleEstado}
                    className={liveSelectedDespesa.isActive ? 'text-amber-600 border-amber-300 hover:bg-amber-50' : 'text-green-600 border-green-300 hover:bg-green-50'}
                  >
                    {liveSelectedDespesa.isActive ? 'Desativar' : 'Ativar'}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setForm(despesaToForm(liveSelectedDespesa)); setEditOpen(true); }}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />Editar
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setRemoveId(liveSelectedDespesa.id)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />Remover
                </Button>
              </div>
            </div>

            {!bannerDismissed && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-start justify-between gap-2">
                <p className="text-sm text-amber-800">
                  Apenas <strong>parcelas liquidadas</strong> debitam o saldo da conta — não o valor total
                </p>
                <button onClick={dismissBanner} className="shrink-0 text-amber-500 hover:text-amber-700" aria-label="Fechar aviso">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <Tabs defaultValue="geral" className="space-y-4">
              <TabsList>
                <TabsTrigger value="geral">Informação Geral</TabsTrigger>
                <TabsTrigger value="parcelas">Parcelas ({liveSelectedDespesa.parcelas.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="geral" className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500">CONTA</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{contaNome(liveSelectedDespesa.contaId)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">CATEGORIA</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {liveSelectedDespesa.categoria ? CATEGORIA_LABELS[liveSelectedDespesa.categoria] : '—'}
                      </p>
                    </div>
                    {liveSelectedDespesa.tipoDespesa === 'Fixa' && (
                      <>
                        <div>
                          <p className="text-xs font-medium text-gray-500">VALOR FIXO</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            €{liveSelectedDespesa.valorFixo?.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) ?? '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">PERIODICIDADE</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {liveSelectedDespesa.periodicidade ? PERIODICIDADE_LABELS[liveSelectedDespesa.periodicidade] : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">DATA DE INÍCIO</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {liveSelectedDespesa.dataInicio ? formatDate(liveSelectedDespesa.dataInicio) : '—'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">RESUMO DE PAGAMENTO</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Valor Total (Bruto)</span>
                      <span className="text-sm font-semibold">€{valorTotal(liveSelectedDespesa).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-sm text-gray-600">Pago (Parcelas Liquidadas)</span>
                      <span className="text-sm font-semibold text-red-600">€{valorPago(liveSelectedDespesa).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pendente</span>
                      <span className="text-sm font-semibold text-gray-900">
                        €{(valorTotal(liveSelectedDespesa) - valorPago(liveSelectedDespesa)).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="parcelas">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900">PARCELAS</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Liquide cada parcela para debitar o saldo da conta</p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead className="w-36 cursor-pointer select-none" onClick={() => toggleSort('data')}>
                          Vencimento<SortIcon field="data" />
                        </TableHead>
                        <TableHead className="w-36 text-right cursor-pointer select-none" onClick={() => toggleSort('valor')}>
                          Valor<SortIcon field="valor" />
                        </TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="w-28" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...liveSelectedDespesa.parcelas]
                        .sort((a, b) => {
                          const mul = parcelaSort.dir === 'asc' ? 1 : -1;
                          if (parcelaSort.field === 'data') return a.dataVencimento.localeCompare(b.dataVencimento) * mul;
                          return (a.valorLiquido - b.valorLiquido) * mul;
                        })
                        .map(p => (
                        <TableRow key={p.id} className={!p.isPaid ? 'opacity-75' : ''}>
                          <TableCell className="text-gray-500 text-sm">{p.numero}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" aria-hidden="true" />
                              <span className="text-sm">{formatDate(p.dataVencimento)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            €{p.valorLiquido.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${p.isPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                              {p.isPaid ? 'Liquidada' : 'Pendente'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {!p.isPaid && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                                  disabled={liquidando === p.id}
                                  onClick={() => openLiquidarDialog(p.id)}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  {liquidando === p.id ? '...' : 'Liquidar'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50"
                                  disabled={removendoParcela === p.id}
                                  onClick={() => setRemoveParcelaId(p.id)}
                                  aria-label="Eliminar parcela"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                            {p.isPaid && (
                              <div className="flex items-center gap-2">
                                {p.dataPagamento && <span className="text-xs text-gray-400">{formatDate(p.dataPagamento)}</span>}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-gray-500 hover:text-amber-600 hover:bg-amber-50"
                                  disabled={estornando === p.id}
                                  onClick={() => handleEstornar(p.id)}
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
                </div>
              </TabsContent>

            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">Selecione uma despesa para ver os detalhes</p>
          </div>
        )}
      </div>

      {/* ── Liquidar dialog ── */}
      <Dialog open={!!liquidarDialog} onOpenChange={open => { if (!open) setLiquidarDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Liquidar Parcela</DialogTitle>
            <DialogDescription>Confirme a data de pagamento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="dp-data" className="text-xs font-medium text-gray-700">DATA DE PAGAMENTO</Label>
              <input
                id="dp-data"
                type="date"
                value={liquidarDialog?.data ?? ''}
                onChange={e => setLiquidarDialog(d => d ? { ...d, data: e.target.value } : null)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLiquidarDialog(null)}>Cancelar</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!liquidarDialog?.data}
                onClick={handleLiquidar}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) setForm(emptyForm()); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
            <DialogDescription>Preencha os dados da despesa</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Campos comuns */}
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

            {/* Tipo de despesa */}
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
                {form.tipoDespesa === 'Recorrente' && 'Repete-se regularmente mas com valores variáveis — introduza as parcelas manualmente.'}
                {form.tipoDespesa === 'Fixa' && 'Valor e periodicidade fixos — as parcelas são geradas automaticamente para 12 meses.'}
              </p>
            </div>

            {/* Campos específicos de Fixa */}
            {form.tipoDespesa === 'Fixa' && (
              <div className="grid grid-cols-2 gap-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div>
                  <Label htmlFor="cd-valor-fixo" className="text-xs font-medium text-gray-700">VALOR FIXO (€) *</Label>
                  <Input
                    id="cd-valor-fixo"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={form.valorFixo}
                    onChange={e => setForm(f => ({ ...f, valorFixo: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
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

            {/* Parcelas manuais (Pontual / Recorrente) */}
            {form.tipoDespesa !== 'Fixa' && (
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
                        <Button type="button" size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 mb-0.5" onClick={() => removeParcela(i)} aria-label={`Remover parcela ${i + 1}`}>✕</Button>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
            <DialogDescription>
              {liveSelectedDespesa?.tipoDespesa !== 'Fixa'
                ? 'As parcelas não liquidadas serão substituídas pelas novas.'
                : 'Pode alterar o nome, categoria e valor fixo. O valor atualiza todas as parcelas pendentes.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
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
            </div>

            {/* Fixa: só edita valor fixo */}
            {liveSelectedDespesa?.tipoDespesa === 'Fixa' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Label htmlFor="ed-valor-fixo" className="text-xs font-medium text-gray-700">VALOR FIXO (€) *</Label>
                <Input
                  id="ed-valor-fixo"
                  type="number" min="0" step="0.01"
                  value={form.valorFixo}
                  onChange={e => setForm(f => ({ ...f, valorFixo: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            )}

            {/* Pontual / Recorrente: edita parcelas não liquidadas */}
            {liveSelectedDespesa?.tipoDespesa !== 'Fixa' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium text-gray-700">PARCELAS NÃO LIQUIDADAS *</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addParcela}><Plus className="w-3.5 h-3.5 mr-1" />Adicionar</Button>
                </div>
                {liveSelectedDespesa && liveSelectedDespesa.parcelas.some(p => p.isPaid) && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2 mb-2">
                    {liveSelectedDespesa.parcelas.filter(p => p.isPaid).length} parcela(s) já liquidada(s) serão mantidas.
                  </p>
                )}
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
                        <Button type="button" size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 mb-0.5" onClick={() => removeParcela(i)} aria-label={`Remover parcela ${i + 1}`}>✕</Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setEditOpen(false); setForm(emptyForm()); }}>Cancelar</Button>
              <Button onClick={handleEdit} disabled={saving}>{saving ? 'A guardar...' : 'Guardar Alterações'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Remove despesa confirm ── */}
      <ConfirmDialog
        open={removeId !== null}
        onOpenChange={open => { if (!open) setRemoveId(null); }}
        title="Remover despesa"
        description="Tem a certeza que deseja remover esta despesa? Todas as parcelas associadas serão eliminadas. Esta ação é irreversível."
        confirmLabel="Remover"
        onConfirm={handleRemove}
      />

      {/* ── Remove parcela confirm ── */}
      <ConfirmDialog
        open={removeParcelaId !== null}
        onOpenChange={open => { if (!open) setRemoveParcelaId(null); }}
        title="Eliminar parcela"
        description="Tem a certeza que deseja eliminar esta parcela? Esta ação é irreversível."
        confirmLabel="Eliminar"
        onConfirm={handleRemoverParcela}
      />
    </div>
  );
}
