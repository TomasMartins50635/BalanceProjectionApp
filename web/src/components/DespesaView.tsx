import { useMemo, useState } from 'react';
import { Search, Plus, Calendar, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatDate } from '@/lib/dates';
import { useToast } from '@/hooks/useToast';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { CATEGORIAS, CATEGORIA_LABELS, type CategoriaContrato, type DespesaDto } from '@/lib/types';

// ── Create form ────────────────────────────────────────────────────────────────

interface CreateForm {
  nome: string;
  contaId: string;
  categoria: CategoriaContrato | '';
  parcelas: { dataVencimento: string; valorBruto: string }[];
}

const emptyForm = (): CreateForm => ({
  nome: '',
  contaId: '',
  categoria: '',
  parcelas: [{ dataVencimento: '', valorBruto: '' }],
});

// ── Component ──────────────────────────────────────────────────────────────────

export function DespesaView() {
  const toast = useToast();
  const { data: despesas, loading, error, reload } = useAsync(() => api.despesas.listar(), []);
  const { data: contas } = useAsync(() => api.contas.listar(), []);

  const [selectedDespesa, setSelectedDespesa] = useState<DespesaDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [liquidando, setLiquidando] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm());
  const [saving, setSaving] = useState(false);

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

  const handleLiquidar = async (parcelaId: string) => {
    setLiquidando(parcelaId);
    try {
      await api.parcelas.liquidar(parcelaId);
      toast('Parcela liquidada com sucesso');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLiquidando(null);
    }
  };

  const handleCreate = async () => {
    if (!form.nome.trim() || !form.contaId || form.parcelas.some(p => !p.dataVencimento || !p.valorBruto)) {
      toast('Preencha todos os campos obrigatórios', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.despesas.criar({
        nome: form.nome.trim(),
        contaId: form.contaId,
        categoria: form.categoria || undefined,
        parcelas: form.parcelas.map((p, i) => ({
          numero: i + 1,
          dataVencimento: p.dataVencimento,
          valorBruto: parseFloat(p.valorBruto),
        })),
      });
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
                  <TableHead className="w-32 text-right">Valor Total</TableHead>
                  <TableHead className="w-28">Categoria</TableHead>
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
                      <TableCell className="font-medium">{d.nome}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        €{valorTotal(d).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {d.categoria ? CATEGORIA_LABELS[d.categoria] : '—'}
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

      {/* ── Right panel: detail ── */}
      <div className="flex-1 bg-gray-50 overflow-auto">
        {liveSelectedDespesa ? (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900">{liveSelectedDespesa.nome}</h3>
              {liveSelectedDespesa.categoria && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 mt-1">
                  {CATEGORIA_LABELS[liveSelectedDespesa.categoria]}
                </span>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-amber-800">
                Apenas <strong>parcelas liquidadas</strong> debitam o saldo da conta — não o valor total
              </p>
            </div>

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
                        <TableHead className="w-36">Vencimento</TableHead>
                        <TableHead className="w-36 text-right">Valor</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="w-28" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {liveSelectedDespesa.parcelas.map(p => (
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
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                                disabled={liquidando === p.id}
                                onClick={() => handleLiquidar(p.id)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                {liquidando === p.id ? '...' : 'Liquidar'}
                              </Button>
                            )}
                            {p.isPaid && p.dataPagamento && (
                              <span className="text-xs text-gray-400">{formatDate(p.dataPagamento)}</span>
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

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
            <DialogDescription>Preencha os dados da despesa e as parcelas de pagamento</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="cd-nome" className="text-xs font-medium text-gray-700">NOME *</Label>
                <Input id="cd-nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="mt-1.5" placeholder="Ex: Fornecedor XYZ" />
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

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(emptyForm()); }}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving}>{saving ? 'A guardar...' : 'Criar Despesa'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
