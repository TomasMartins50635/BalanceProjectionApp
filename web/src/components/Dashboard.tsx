import { useMemo, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/dates';

export function Dashboard() {
  const toast = useToast();
  const { data: contas, loading: contasLoading, error: contasError, reload: reloadContas } = useAsync(() => api.contas.listar(), []);

  const [selectedContaId, setSelectedContaId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formSaldo, setFormSaldo] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCriarConta = async () => {
    if (!formNome.trim()) return;
    setSaving(true);
    try {
      await api.contas.criar({ nome: formNome.trim(), saldoInicial: formSaldo ? parseFloat(formSaldo) : undefined });
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
  const [deleteContaId, setDeleteContaId] = useState<string | null>(null);

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

  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [useCurrentDate, setUseCurrentDate] = useState(true);

  // Pick first conta by default once loaded
  const effectiveContaId = selectedContaId ?? contas?.[0]?.id ?? null;

  const { data: parcelas, loading: parcelasLoading, reload: reloadParcelas } = useAsync(
    () => effectiveContaId ? api.parcelas.listarPorConta(effectiveContaId) : Promise.resolve([]),
    [effectiveContaId],
  );

  const conta = contas?.find(c => c.id === effectiveContaId);

  // Compute historical saldo on selectedDate by back-calculating from current saldo:
  // subtract paid parcelas that were paid AFTER selectedDate, restore their effect.
  const saldoNaData = useMemo(() => {
    if (!conta) return null;
    if (useCurrentDate) return conta.saldo;
    const paid = (parcelas ?? []).filter(p => p.isPaid && p.dataPagamento && p.dataPagamento > selectedDateStr);
    return paid.reduce((saldo, p) => {
      if (p.receitaId) return saldo - p.valorLiquido;   // reverse the credit
      if (p.despesaId) return saldo + p.valorLiquido;   // reverse the debit
      return saldo;
    }, conta.saldo);
  }, [conta, parcelas, useCurrentDate, selectedDateStr]);

  const allTransactions = useMemo(() => {
    return (parcelas ?? [])
      .map(p => ({
        id: p.id,
        type: p.receitaId ? 'receita' as const : 'despesa' as const,
        valor: p.valorLiquido,
        data: p.dataVencimento,
        isPaid: p.isPaid,
        dataPagamento: p.dataPagamento,
      }))
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [parcelas]);

  const visibleTransactions = useMemo(
    () => useCurrentDate ? allTransactions : allTransactions.filter(t => t.data <= selectedDateStr),
    [allTransactions, useCurrentDate, selectedDateStr],
  );

  if (contasError) {
    return (
      <div className="p-6 text-center text-red-600">
        <p className="font-medium">Erro ao carregar contas</p>
        <p className="text-sm mt-1">{contasError}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 md:mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-1">Gestão de Contas</h2>
          <p className="text-xs md:text-sm text-gray-600">Visão geral das contas bancárias e movimentações</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-1" /> Nova Conta
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) { setFormNome(''); setFormSaldo(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conta</DialogTitle>
            <DialogDescription>Preencha os dados para criar uma conta bancária.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="conta-nome">Nome *</Label>
              <Input
                id="conta-nome"
                placeholder="Ex: Conta Principal"
                value={formNome}
                onChange={e => setFormNome(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="conta-saldo">Saldo Inicial (€)</Label>
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
              <Button onClick={handleCriarConta} disabled={saving || !formNome.trim()}>
                {saving ? 'A guardar…' : 'Criar Conta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-5 mb-4 md:mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">SELECIONAR CONTA</label>
            {contasLoading ? (
              <div className="h-11 bg-gray-100 animate-pulse rounded-md" />
            ) : (
              <div className="flex gap-2">
                <Select
                  value={effectiveContaId ?? ''}
                  onValueChange={v => { setSelectedContaId(v); reloadParcelas(); }}
                >
                  <SelectTrigger className="flex-1 h-11">
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {(contas ?? []).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {effectiveContaId && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0 text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => setDeleteContaId(effectiveContaId)}
                    aria-label="Eliminar conta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="dashboard-date" className="text-xs font-medium text-gray-700 mb-2 block">VER SALDO NA DATA</Label>
            <div className="flex gap-2">
              <input
                id="dashboard-date"
                type="date"
                value={selectedDateStr}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => { setSelectedDateStr(e.target.value); setUseCurrentDate(false); }}
                aria-label="Selecionar data para ver saldo histórico"
                className="flex-1 h-11 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              {!useCurrentDate && (
                <Button variant="outline" className="h-11 px-4" onClick={() => { setSelectedDateStr(new Date().toISOString().split('T')[0]); setUseCurrentDate(true); }}>
                  Hoje
                </Button>
              )}
            </div>
            {!useCurrentDate && (
              <p className="text-xs text-gray-600 mt-1.5">Saldo estimado em {formatDate(selectedDateStr)}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 md:mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-5">
          <p className="text-xs font-medium text-gray-600 mb-1">
            {useCurrentDate ? 'SALDO ATUAL' : `SALDO ESTIMADO EM ${formatDate(selectedDateStr)}`}
          </p>
          {contasLoading || parcelasLoading ? (
            <div className="h-9 w-40 bg-gray-100 animate-pulse rounded mt-2" />
          ) : saldoNaData !== null ? (
            <>
              <p className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
                €{saldoNaData.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
              </p>
              {!useCurrentDate && conta && (
                <div className={`flex items-center gap-1 text-sm ${saldoNaData >= conta.saldo ? 'text-green-600' : 'text-red-600'}`}>
                  {saldoNaData >= conta.saldo ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span className="font-medium">
                    €{Math.abs(saldoNaData - conta.saldo).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} vs. hoje
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 mt-2">Selecione uma conta</p>
          )}
          <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
            Calculado parcela a parcela — apenas parcelas liquidadas afetam o saldo
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-5">
          <p className="text-xs font-medium text-gray-600 mb-1">SALDO ATUAL (REAL)</p>
          {contasLoading ? (
            <div className="h-9 w-40 bg-gray-100 animate-pulse rounded mt-2" />
          ) : conta ? (
            <p className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
              €{conta.saldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-2">—</p>
          )}
          <p className="text-sm text-gray-500">{conta?.nome ?? '—'}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            {useCurrentDate ? 'PARCELAS' : `PARCELAS ATÉ ${formatDate(selectedDateStr)}`}
          </h3>
          <p className="text-xs text-gray-600 mt-1">Apenas parcelas liquidadas afetam o saldo</p>
        </div>
        {parcelasLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Tipo</TableHead>
                <TableHead className="w-36">Data Vencimento</TableHead>
                <TableHead className="w-36">Data Pagamento</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-40 text-right">Valor Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-gray-500 py-8">
                    {effectiveContaId ? 'Nenhuma parcela encontrada' : 'Selecione uma conta'}
                  </TableCell>
                </TableRow>
              ) : (
                visibleTransactions.map(t => (
                  <TableRow key={t.id} className={!t.isPaid ? 'opacity-60' : ''}>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.type === 'receita' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {t.type === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">{formatDate(t.data)}</TableCell>
                    <TableCell className="text-gray-600">
                      {t.dataPagamento ? formatDate(t.dataPagamento) : '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.isPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {t.isPaid ? 'Liquidada' : 'Pendente'}
                      </span>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${t.isPaid ? (t.type === 'receita' ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>
                      {t.type === 'receita' ? '+' : '-'}€{t.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

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
