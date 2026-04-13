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
import { CATEGORIAS, CATEGORIA_LABELS, type CategoriaContrato, type ReceitaDto } from '@/lib/types';

// ── Create form ────────────────────────────────────────────────────────────────

interface CreateForm {
  nome: string;
  contaId: string;
  categoria: CategoriaContrato | '';
  percentagemComissao: string;
  parcelas: { dataVencimento: string; valorBruto: string }[];
}

const emptyForm = (): CreateForm => ({
  nome: '',
  contaId: '',
  categoria: '',
  percentagemComissao: '',
  parcelas: [{ dataVencimento: '', valorBruto: '' }],
});

// ── Component ──────────────────────────────────────────────────────────────────

export function ReceitaView() {
  const toast = useToast();
  const { data: receitas, loading, error, reload } = useAsync(() => api.receitas.listar(), []);
  const { data: contas } = useAsync(() => api.contas.listar(), []);

  const [selectedReceita, setSelectedReceita] = useState<ReceitaDto | null>(null);
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
    (receitas ?? []).filter(r =>
      r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.categoria && CATEGORIA_LABELS[r.categoria].toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    [receitas, searchTerm],
  );

  // Keep selection in sync after reload
  const liveSelectedReceita = useMemo(
    () => selectedReceita ? (receitas ?? []).find(r => r.id === selectedReceita.id) ?? null : null,
    [receitas, selectedReceita],
  );

  const valorTotal = (r: ReceitaDto) => r.parcelas.reduce((s, p) => s + p.valorBruto, 0);

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
      await api.receitas.criar({
        nome: form.nome.trim(),
        contaId: form.contaId,
        categoria: form.categoria || undefined,
        percentagemComissao: form.percentagemComissao ? parseFloat(form.percentagemComissao) : undefined,
        parcelas: form.parcelas.map((p, i) => ({
          numero: i + 1,
          dataVencimento: p.dataVencimento,
          valorBruto: parseFloat(p.valorBruto),
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
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Receitas / Faturação</h2>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Nova Receita</span>
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <Input
              aria-label="Pesquisar receitas"
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
                      {(receitas ?? []).length === 0 ? 'Nenhuma receita registada' : 'Nenhum resultado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(r => (
                    <TableRow
                      key={r.id}
                      className={`cursor-pointer ${liveSelectedReceita?.id === r.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedReceita(r)}
                    >
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        €{valorTotal(r).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {r.categoria ? CATEGORIA_LABELS[r.categoria] : '—'}
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
        {liveSelectedReceita ? (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900">{liveSelectedReceita.nome}</h3>
              {liveSelectedReceita.categoria && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 mt-1">
                  {CATEGORIA_LABELS[liveSelectedReceita.categoria]}
                </span>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-green-800">
                Parcelas liquidadas <strong>creditam</strong> o saldo da conta (ValorLíquido após comissão)
              </p>
            </div>

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
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {liveSelectedReceita.categoria ? CATEGORIA_LABELS[liveSelectedReceita.categoria] : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">VALOR TOTAL (BRUTO)</p>
                      <p className="text-sm font-semibold text-green-600 mt-1">
                        €{valorTotal(liveSelectedReceita).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">VALOR LÍQUIDO TOTAL</p>
                      <p className="text-sm font-semibold text-green-600 mt-1">
                        €{liveSelectedReceita.parcelas.reduce((s, p) => s + p.valorLiquido, 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {liveSelectedReceita.percentagemComissao != null && (
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-1">COMISSÃO</p>
                      <p className="text-sm text-gray-700">{liveSelectedReceita.percentagemComissao}% deduzida no ValorLíquido de cada parcela</p>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead className="w-36">Vencimento</TableHead>
                        <TableHead className="w-36 text-right">Bruto</TableHead>
                        <TableHead className="w-36 text-right">Líquido</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="w-28" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {liveSelectedReceita.parcelas.map(p => (
                        <TableRow key={p.id} className={!p.isPaid ? 'opacity-75' : ''}>
                          <TableCell className="text-gray-500 text-sm">{p.numero}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" aria-hidden="true" />
                              <span className="text-sm">{formatDate(p.dataVencimento)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm text-gray-600">
                            €{p.valorBruto.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
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
                                className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
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
            <p className="text-sm">Selecione uma receita para ver os detalhes</p>
          </div>
        )}
      </div>

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Receita</DialogTitle>
            <DialogDescription>Preencha os dados da receita e as parcelas de pagamento</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="cr-nome" className="text-xs font-medium text-gray-700">NOME *</Label>
                <Input id="cr-nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="mt-1.5" placeholder="Ex: Projeto ABC" />
              </div>
              <div>
                <Label htmlFor="cr-conta" className="text-xs font-medium text-gray-700">CONTA *</Label>
                <Select value={form.contaId} onValueChange={v => setForm(f => ({ ...f, contaId: v }))}>
                  <SelectTrigger id="cr-conta" className="mt-1.5"><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
                  <SelectContent>
                    {(contas ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cr-cat" className="text-xs font-medium text-gray-700">CATEGORIA</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v as CategoriaContrato }))}>
                  <SelectTrigger id="cr-cat" className="mt-1.5"><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cr-com" className="text-xs font-medium text-gray-700">COMISSÃO (%)</Label>
                <div className="relative mt-1.5">
                  <Input id="cr-com" type="number" value={form.percentagemComissao} onChange={e => setForm(f => ({ ...f, percentagemComissao: e.target.value }))} className="pr-8" step="0.1" min="0" max="100" placeholder="0" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
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
                      <label className="text-xs text-gray-500">Valor Bruto (€)</label>
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
              <Button onClick={handleCreate} disabled={saving}>{saving ? 'A guardar...' : 'Criar Receita'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
