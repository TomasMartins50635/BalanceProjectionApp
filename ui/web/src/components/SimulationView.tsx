import { useMemo, useState } from 'react';
import { TrendingUp, Trash2, Plus, AlertCircle, CheckCircle2, Sparkles, Save, FolderOpen, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDate } from '@/lib/dates';
import { useToast } from '@/hooks/useToast';

interface ParcelaSimulada { id: string; dataVencimento: string; valorParcela: number; isPaid: boolean; }
type Categoria = 'Consultoria' | 'Vendas' | 'Serviços' | 'Licenciamento' | 'Outro';
interface SimulatedReceita { id: string; nome: string; valorEstimado: number; dataPrevista: string; categoria: Categoria; parcelas: ParcelaSimulada[]; }
interface SavedSimulation { id: string; nome: string; contaId: string; receitas: SimulatedReceita[]; dataCriacao: string; }

const contas = [
  { id: '1', nome: 'Conta Corrente Principal', banco: 'Millennium BCP', saldoAtual: 1260 },
  { id: '2', nome: 'Conta Poupança', banco: 'Santander', saldoAtual: 52300 },
  { id: '3', nome: 'Conta Empresarial', banco: 'Novo Banco', saldoAtual: 12890 },
  { id: 'all', nome: 'TODAS AS CONTAS (SOMATÓRIO)', banco: 'Consolidado', saldoAtual: 66450 },
];

const generateChartData = (currentBalance: number, simulations: SimulatedReceita[]) => {
  const today = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const label = monthDate.toLocaleString('pt-PT', { month: 'short', year: 'numeric' });
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split('T')[0];
    const cumulative = simulations.flatMap(s => s.parcelas).filter(p => p.isPaid && p.dataVencimento <= endOfMonth).reduce((s, p) => s + p.valorParcela, 0);
    return { month: label, real: Math.round(currentBalance + i * 500), simulado: Math.round(currentBalance + cumulative + i * 500) };
  });
};

export function SimulationView() {
  const toast = useToast();
  const [selectedConta, setSelectedConta] = useState('all');
  const [selectedSim, setSelectedSim] = useState<SimulatedReceita | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [simulations, setSimulations] = useState<SimulatedReceita[]>([
    { id: 's1', nome: 'Projeto Cliente Premium', valorEstimado: 15000, dataPrevista: '2026-05-15', categoria: 'Consultoria', parcelas: [
      { id: 'p1-1', dataVencimento: '2026-05-15', valorParcela: 5000, isPaid: false },
      { id: 'p1-2', dataVencimento: '2026-06-15', valorParcela: 5000, isPaid: false },
      { id: 'p1-3', dataVencimento: '2026-07-15', valorParcela: 5000, isPaid: false },
    ]},
    { id: 's2', nome: 'Contrato Anual Renovação', valorEstimado: 8500, dataPrevista: '2026-06-01', categoria: 'Licenciamento', parcelas: [
      { id: 'p2-1', dataVencimento: '2026-06-01', valorParcela: 8500, isPaid: false },
    ]},
  ]);
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([
    { id: 'saved1', nome: 'Cenário Otimista Q2', contaId: '1', receitas: [], dataCriacao: '2026-04-10' },
  ]);
  const [form, setForm] = useState({ nome: '', valorEstimado: '', dataPrevista: '', numeroParcelas: '1', categoria: 'Consultoria' as Categoria });
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [simulationName, setSimulationName] = useState('');
  const [deleteSimTarget, setDeleteSimTarget] = useState<SimulatedReceita | null>(null);
  const [deleteSavedTarget, setDeleteSavedTarget] = useState<SavedSimulation | null>(null);

  const conta = contas.find(c => c.id === selectedConta) ?? contas[contas.length - 1];

  const saldoProjetado = conta.saldoAtual + simulations.flatMap(s => s.parcelas).filter(p => p.isPaid && p.dataVencimento <= selectedDateStr).reduce((s, p) => s + p.valorParcela, 0);
  const delta = saldoProjetado - conta.saldoAtual;

  const handleAdd = () => {
    if (!form.nome || !form.valorEstimado || !form.dataPrevista) return;
    const valorTotal = parseFloat(form.valorEstimado);
    const num = parseInt(form.numeroParcelas);
    const parcelas: ParcelaSimulada[] = Array.from({ length: num }, (_, i) => {
      const d = new Date(form.dataPrevista + 'T00:00:00');
      d.setMonth(d.getMonth() + i);
      return { id: `p${Date.now()}-${i}`, dataVencimento: d.toISOString().split('T')[0], valorParcela: valorTotal / num, isPaid: false };
    });
    setSimulations([...simulations, { id: `s${Date.now()}`, nome: form.nome, valorEstimado: valorTotal, dataPrevista: form.dataPrevista, categoria: form.categoria, parcelas }]);
    setForm({ nome: '', valorEstimado: '', dataPrevista: '', numeroParcelas: '1', categoria: 'Consultoria' });
  };

  const handleToggleParcela = (simId: string, parcelaId: string) => {
    setSimulations(simulations.map(s => s.id !== simId ? s : { ...s, parcelas: s.parcelas.map(p => p.id === parcelaId ? { ...p, isPaid: !p.isPaid } : p) }));
    if (selectedSim?.id === simId) setSelectedSim(prev => prev ? { ...prev, parcelas: prev.parcelas.map(p => p.id === parcelaId ? { ...p, isPaid: !p.isPaid } : p) } : null);
  };

  const handleMarkAllUntil = (simId: string) => {
    setSimulations(simulations.map(s => s.id !== simId ? s : { ...s, parcelas: s.parcelas.map(p => ({ ...p, isPaid: p.dataVencimento <= selectedDateStr })) }));
    setSelectedSim(prev => prev && prev.id === simId ? { ...prev, parcelas: prev.parcelas.map(p => ({ ...p, isPaid: p.dataVencimento <= selectedDateStr })) } : prev);
  };

  const handleDeleteSim = () => {
    if (!deleteSimTarget) return;
    setSimulations(simulations.filter(x => x.id !== deleteSimTarget.id));
    if (selectedSim?.id === deleteSimTarget.id) setSelectedSim(null);
    setDeleteSimTarget(null);
  };

  const handleSave = () => {
    if (!simulationName.trim()) return;
    setSavedSimulations([...savedSimulations, { id: `saved${Date.now()}`, nome: simulationName, contaId: selectedConta, receitas: [...simulations], dataCriacao: new Date().toISOString().split('T')[0] }]);
    setSimulationName('');
    setSaveDialogOpen(false);
    toast('Simulação guardada com sucesso');
  };

  const handleDeleteSaved = () => {
    if (!deleteSavedTarget) return;
    setSavedSimulations(savedSimulations.filter(x => x.id !== deleteSavedTarget.id));
    setDeleteSavedTarget(null);
  };

  const chartData = useMemo(() => generateChartData(conta.saldoAtual, simulations), [conta.saldoAtual, simulations]);

  return (
    <div className="h-full overflow-auto bg-slate-50">
      <div className="sticky top-0 z-20 bg-blue-700 text-white px-6 py-4 shadow-md border-b-2 border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">Modo Simulação</h2>
              <p className="text-sm text-blue-200">Ambiente de teste — Dados não confirmados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-white/10 border-white/30 hover:bg-white/20 text-white rounded-lg" onClick={() => setLoadDialogOpen(true)}>
              <FolderOpen className="w-4 h-4 mr-2" />Carregar
            </Button>
            <Button variant="outline" className="bg-white/10 border-white/30 hover:bg-white/20 text-white rounded-lg" onClick={() => setSaveDialogOpen(true)}>
              <Save className="w-4 h-4 mr-2" />Guardar
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Conta para Simulação</Label>
          <Select value={selectedConta} onValueChange={setSelectedConta}>
            <SelectTrigger className="w-full max-w-md h-11 border-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} — {c.banco}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="space-y-4 md:space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">Adicionar Receita Simulada</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sim-nome" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome / Título da Receita</Label>
                  <Input id="sim-nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Projeto Cliente Premium" className="mt-1.5 border-slate-200 focus-visible:ring-indigo-400" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sim-valor" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor Total</Label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                      <Input id="sim-valor" type="number" value={form.valorEstimado} onChange={e => setForm({ ...form, valorEstimado: e.target.value })} placeholder="0.00" className="pl-7 border-slate-200 focus-visible:ring-indigo-400 tabular-nums" step="0.01" min="0" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="sim-cat" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoria</Label>
                    <Select value={form.categoria} onValueChange={(v: Categoria) => setForm({ ...form, categoria: v })}>
                      <SelectTrigger id="sim-cat" className="mt-1.5 border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['Consultoria', 'Vendas', 'Serviços', 'Licenciamento', 'Outro'] as Categoria[]).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sim-data" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data Prevista (1ª Parcela)</Label>
                    <input id="sim-data" type="date" value={form.dataPrevista} min={new Date().toISOString().split('T')[0]} onChange={e => setForm({ ...form, dataPrevista: e.target.value })} aria-label="Data prevista da primeira parcela" className="mt-1.5 flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" />
                  </div>
                  <div>
                    <Label htmlFor="sim-parcelas" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Número de Parcelas</Label>
                    <Input id="sim-parcelas" type="number" value={form.numeroParcelas} onChange={e => setForm({ ...form, numeroParcelas: e.target.value })} className="mt-1.5 border-slate-200 focus-visible:ring-indigo-400 tabular-nums" min="1" max="12" />
                  </div>
                </div>
                <Button onClick={handleAdd} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg" disabled={!form.nome || !form.valorEstimado || !form.dataPrevista}>
                  <Plus className="w-4 h-4 mr-2" />Adicionar à Simulação
                </Button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Receitas Simuladas ({simulations.length})</h4>
                <p className="text-xs text-slate-500 mt-0.5">Clique numa receita para gerir parcelas</p>
              </div>
              {simulations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</TableHead>
                      <TableHead className="w-24 text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoria</TableHead>
                      <TableHead className="w-20 text-xs font-semibold text-slate-500 uppercase tracking-wide">Parcelas</TableHead>
                      <TableHead className="w-28 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor Total</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulations.map(s => {
                      const paid = s.parcelas.filter(p => p.isPaid).length;
                      return (
                        <TableRow key={s.id} className={`cursor-pointer transition-colors ${selectedSim?.id === s.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`} onClick={() => setSelectedSim(s)}>
                          <TableCell className="font-medium text-slate-800">{s.nome}</TableCell>
                          <TableCell><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{s.categoria}</span></TableCell>
                          <TableCell><span className="text-sm tabular-nums text-slate-600">{paid}/{s.parcelas.length}</span></TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-indigo-600">€{s.valorEstimado.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => { setSimulations(simulations.filter(x => x.id !== s.id)); if (selectedSim?.id === s.id) setSelectedSim(null); }} className="h-7 px-2 text-green-600 hover:bg-green-50" title="Converter em receita real" aria-label="Converter em receita real"><CheckCircle2 className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeleteSimTarget(s)} className="h-7 px-2 text-red-600 hover:bg-red-50" aria-label="Eliminar receita simulada"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <p className="text-sm">Nenhuma simulação adicionada</p>
                  <p className="text-xs mt-1 text-slate-400">Adicione receitas hipotéticas para ver o impacto</p>
                </div>
              )}
            </div>

            {selectedSim && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Parcelas — {selectedSim.nome}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Marque como pagas para incluir no cálculo do saldo</p>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setSelectedSim(null)}>Fechar</Button>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => handleMarkAllUntil(selectedSim.id)}>
                    Marcar pagas até {formatDate(selectedDateStr)}
                  </Button>
                </div>
                <div className="px-5 py-3 bg-white border-b border-slate-100">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-slate-500">Valor Total</p>
                      <p className="text-sm font-semibold tabular-nums text-slate-800">€{selectedSim.valorEstimado.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Pago</p>
                      <p className="text-sm font-semibold tabular-nums text-green-600">€{selectedSim.parcelas.filter(p => p.isPaid).reduce((s, p) => s + p.valorParcela, 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Pendente</p>
                      <p className="text-sm font-semibold tabular-nums text-slate-600">€{selectedSim.parcelas.filter(p => !p.isPaid).reduce((s, p) => s + p.valorParcela, 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-36 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vencimento</TableHead>
                      <TableHead className="w-36 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor Parcela</TableHead>
                      <TableHead className="w-28 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSim.parcelas.map(p => (
                      <TableRow key={p.id}>
                        <TableCell><div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-300" aria-hidden="true" /><span className="text-sm tabular-nums">{formatDate(p.dataVencimento)}</span></div></TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-indigo-600">€{p.valorParcela.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <button onClick={() => handleToggleParcela(selectedSim.id, p.id)} className={`px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${p.isPaid ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                            {p.isPaid ? 'Pago' : 'Pendente'}
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm">
              <Label htmlFor="sim-date" className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Ver Saldo Simulado na Data</Label>
              <input id="sim-date" type="date" value={selectedDateStr} min={new Date().toISOString().split('T')[0]} onChange={e => setSelectedDateStr(e.target.value)} aria-label="Data para ver saldo simulado" className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" />
              <p className="text-xs text-slate-500 mt-2">Apenas parcelas pagas até {formatDate(selectedDateStr)} serão consideradas</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">Comparação de Saldo</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Saldo Atual (Real)</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold tabular-nums text-slate-900">€{conta.saldoAtual.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                    <span className="text-sm text-slate-500">confirmado</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-dashed border-slate-200" /></div>
                  <div className="relative flex justify-center"><span className="bg-white px-3 text-xs font-semibold text-indigo-600 uppercase tracking-wide">+ Simulações</span></div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-wider text-indigo-500 uppercase mb-1">Saldo Projetado em {formatDate(selectedDateStr)}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl md:text-4xl font-bold tabular-nums text-indigo-600">€{saldoProjetado.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                    <span className="text-sm text-indigo-400">estimado</span>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold tracking-wider text-green-600 uppercase mb-1">Impacto Total</p>
                      <p className="text-2xl font-bold tabular-nums text-green-600">+€{delta.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-2 tabular-nums">Aumento de {((delta / conta.saldoAtual) * 100).toFixed(1)}% sobre o saldo atual</p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-indigo-900">Como Funciona</p>
                  <ul className="text-xs text-indigo-700 mt-1 space-y-1">
                    <li>• Cada receita simulada é dividida em parcelas mensais</li>
                    <li>• Apenas parcelas marcadas como "Pagas" impactam o saldo projetado</li>
                    <li>• Selecione uma data futura para ver o saldo simulado nessa data</li>
                    <li>• Use o botão (✓) para converter simulação em receita real</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm">
          <div className="mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-semibold text-slate-900">Tendência: Real vs. Simulado</h3>
            <p className="text-xs md:text-sm text-slate-500 mt-1">Projeção dos próximos 6 meses</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.97)', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v) => typeof v === 'number' ? `€${v.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}` : ''} />
              <Legend wrapperStyle={{ fontSize: '12px' }} iconType="line" />
              <Line type="monotone" dataKey="real" name="Tendência Real" stroke="#94a3b8" strokeWidth={2} dot={{ fill: '#94a3b8', r: 4 }} />
              <Line type="monotone" dataKey="simulado" name="Tendência Simulada" stroke="#6366f1" strokeWidth={3} strokeDasharray="5 5" dot={{ fill: '#6366f1', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="shadow-xl">
          <DialogHeader>
            <DialogTitle>Guardar Simulação</DialogTitle>
            <DialogDescription>Guarde este cenário para carregar mais tarde</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="save-nome" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome da Simulação</Label>
              <Input id="save-nome" value={simulationName} onChange={e => setSimulationName(e.target.value)} placeholder="Ex: Cenário Otimista Q2" className="mt-1.5 border-slate-200 focus-visible:ring-indigo-400" />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-sm text-slate-700"><strong>Conta:</strong> {conta.nome}</p>
              <p className="text-sm text-slate-700 mt-1"><strong>Receitas Simuladas:</strong> {simulations.length}</p>
            </div>
            <Button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg" disabled={!simulationName.trim() || simulations.length === 0}>
              <Save className="w-4 h-4 mr-2" />Guardar Simulação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent className="max-w-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle>Simulações Guardadas</DialogTitle>
            <DialogDescription>Carregue uma simulação previamente guardada</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {savedSimulations.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</TableHead>
                      <TableHead className="w-24 text-xs font-semibold text-slate-500 uppercase tracking-wide">Receitas</TableHead>
                      <TableHead className="w-28 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</TableHead>
                      <TableHead className="w-36" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedSimulations.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium text-slate-800">{s.nome}</TableCell>
                        <TableCell className="tabular-nums">{s.receitas.length}</TableCell>
                        <TableCell className="text-sm text-slate-600 tabular-nums">{formatDate(s.dataCriacao)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setSelectedConta(s.contaId); setSimulations([...s.receitas]); setLoadDialogOpen(false); }}>Carregar</Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteSavedTarget(s)} className="text-red-500 hover:bg-red-50" aria-label="Eliminar simulação guardada"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500"><p className="text-sm">Nenhuma simulação guardada</p></div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteSimTarget !== null}
        onOpenChange={open => { if (!open) setDeleteSimTarget(null); }}
        title="Eliminar Simulação"
        description={`Tem a certeza que deseja eliminar "${deleteSimTarget?.nome}"?`}
        confirmLabel="Eliminar"
        onConfirm={handleDeleteSim}
      />

      <ConfirmDialog
        open={deleteSavedTarget !== null}
        onOpenChange={open => { if (!open) setDeleteSavedTarget(null); }}
        title="Eliminar Simulação Guardada"
        description={`Tem a certeza que deseja eliminar "${deleteSavedTarget?.nome}"?`}
        confirmLabel="Eliminar"
        onConfirm={handleDeleteSaved}
      />
    </div>
  );
}
