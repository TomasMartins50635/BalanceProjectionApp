import { useMemo, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatDate } from '@/lib/dates';
import { useToast } from '@/hooks/useToast';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import type { FinanciamentoDto } from '@/lib/types';

// ── Create form ────────────────────────────────────────────────────────────────

interface CreateForm {
  nome: string;
  valor: string;
  data: string;
  contaId: string;
  despesaId: string;
}

const emptyForm = (): CreateForm => ({ nome: '', valor: '', data: '', contaId: '', despesaId: '' });

// ── Component ──────────────────────────────────────────────────────────────────

export function FinanciamentoView() {
  const toast = useToast();
  const { data: contas } = useAsync(() => api.contas.listar(), []);
  const { data: despesas } = useAsync(() => api.despesas.listar(), []);

  // Load financiamentos for all contas in parallel and flatten
  const { data: financiamentos, loading, error, reload } = useAsync(async () => {
    const contasList = await api.contas.listar();
    if (contasList.length === 0) return [];
    const results = await Promise.all(contasList.map(c => api.financiamentos.listarPorConta(c.id)));
    return results.flat();
  }, []);

  const [selectedF, setSelectedF] = useState<FinanciamentoDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const contaNome = useMemo(
    () => (id: string) => contas?.find(c => c.id === id)?.nome ?? id,
    [contas],
  );

  const despesaNome = useMemo(
    () => (id: string | null) => id ? (despesas?.find(d => d.id === id)?.nome ?? id) : null,
    [despesas],
  );

  const filtered = useMemo(() =>
    (financiamentos ?? []).filter(f =>
      f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contaNome(f.contaId).toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [financiamentos, searchTerm, contaNome],
  );

  const liveSelectedF = useMemo(
    () => selectedF ? (financiamentos ?? []).find(f => f.id === selectedF.id) ?? null : null,
    [financiamentos, selectedF],
  );

  const handleCreate = async () => {
    if (!form.nome.trim() || !form.valor || !form.data || !form.contaId) {
      toast('Preencha todos os campos obrigatórios', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.financiamentos.criar({
        nome: form.nome.trim(),
        valor: parseFloat(form.valor),
        data: form.data,
        contaId: form.contaId,
        despesaId: form.despesaId || undefined,
      });
      toast('Financiamento registado. O valor foi creditado na conta imediatamente.');
      setCreateOpen(false);
      setForm(emptyForm());
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* ── Left panel: list ── */}
      <div className="w-full md:w-[480px] border-b md:border-b-0 md:border-r border-gray-200 bg-white flex flex-col max-h-[40vh] md:max-h-none">
        <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Financiamentos</h2>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 md:mr-1" /><span className="hidden md:inline">Novo Financiamento</span>
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <Input
              aria-label="Pesquisar financiamentos"
              placeholder="Pesquisar por nome ou conta..."
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
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />)}
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-gray-50 z-10">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-32 text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm text-gray-500 py-8">
                      {(financiamentos ?? []).length === 0 ? 'Nenhum financiamento registado' : 'Nenhum resultado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(f => (
                    <TableRow
                      key={f.id}
                      className={`cursor-pointer ${liveSelectedF?.id === f.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedF(f)}
                    >
                      <TableCell>
                        <div className="font-medium">{f.nome}</div>
                        <div className="text-xs text-gray-500">{contaNome(f.contaId)}</div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">
                        €{f.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
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
        {liveSelectedF ? (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900">{liveSelectedF.nome}</h3>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-blue-800">
                O valor deste financiamento foi <strong>creditado imediatamente</strong> na conta ao ser registado
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-gray-500">NOME</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{liveSelectedF.nome}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">CONTA</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{contaNome(liveSelectedF.contaId)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">VALOR</p>
                  <p className="text-xl font-bold text-blue-600 mt-1">
                    €{liveSelectedF.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">DATA</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(liveSelectedF.data)}</p>
                </div>
              </div>

              {liveSelectedF.despesaId && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">DESPESA ASSOCIADA</p>
                  <p className="text-sm text-gray-900">{despesaNome(liveSelectedF.despesaId)}</p>
                  <p className="text-xs text-gray-500 mt-1">Esta despesa foi financiada por este financiamento</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">Selecione um financiamento para ver os detalhes</p>
          </div>
        )}
      </div>

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Financiamento</DialogTitle>
            <DialogDescription>
              O valor será creditado imediatamente na conta selecionada
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="cf-nome" className="text-xs font-medium text-gray-700">NOME *</Label>
              <Input id="cf-nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="mt-1.5" placeholder="Ex: Empréstimo Bancário" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cf-valor" className="text-xs font-medium text-gray-700">VALOR *</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                  <Input id="cf-valor" type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} className="pl-7" step="0.01" min="0" placeholder="0.00" />
                </div>
              </div>
              <div>
                <Label htmlFor="cf-data" className="text-xs font-medium text-gray-700">DATA *</Label>
                <input id="cf-data" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="mt-1.5 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
              </div>
            </div>

            <div>
              <Label htmlFor="cf-conta" className="text-xs font-medium text-gray-700">CONTA *</Label>
              <Select value={form.contaId} onValueChange={v => setForm(f => ({ ...f, contaId: v }))}>
                <SelectTrigger id="cf-conta" className="mt-1.5"><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
                <SelectContent>
                  {(contas ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cf-despesa" className="text-xs font-medium text-gray-700">DESPESA ASSOCIADA (opcional)</Label>
              <Select value={form.despesaId} onValueChange={v => setForm(f => ({ ...f, despesaId: v }))}>
                <SelectTrigger id="cf-despesa" className="mt-1.5"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  {(despesas ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(emptyForm()); }}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving}>{saving ? 'A guardar...' : 'Registar Financiamento'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
