import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp, Plus, AlertCircle, Sparkles, Save, Trash2, Edit2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDate } from '@/lib/dates';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import type { ContaDto, DespesaDto, ParcelaDto, PrevisaoDto, ReceitaDto } from '@/lib/types';
import type { Periodicidade } from '@/lib/types';
import { CATEGORIAS_RECEITA, CATEGORIA_RECEITA_LABELS, CATEGORIAS, CATEGORIA_LABELS } from '@/lib/types';
import { SimulationCalendar } from './SimulationCalendar';
import type { DespesaProjetada, ParcelaGerada, ParcelaReal } from './SimulationCalendar';

const GLOBAL_ID = '_global';

const HORIZONTES = [3, 6, 12, 24, 36, 48, 60] as const;
type Horizonte = typeof HORIZONTES[number];

function formatHorizonteLabel(h: Horizonte): string {
  return h >= 12 && h % 12 === 0 ? `${h / 12}a` : `${h}m`;
}

interface FormState {
  nome: string;
  diasEntreVendas: string;
  valorMedioVenda: string;
  diasEntreArrendamentos: string;
  valorMedioArrendamento: string;
}

// ── utilidades ────────────────────────────────────────────────────────────────

function gerarParcelas(
  diasVendas: number | null,
  valorVenda: number | null,
  diasArrendamentos: number | null,
  valorArrendamento: number | null,
  horizonteMeses: Horizonte,
): ParcelaGerada[] {
  const hoje = new Date();
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + horizonteMeses, hoje.getDate());
  const resultado: ParcelaGerada[] = [];

  const gerar = (tipo: 'Vendas' | 'Arrendamentos', dias: number, valor: number) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + dias);
    let idx = 0;
    while (d <= fim) {
      resultado.push({ id: `${tipo}-${idx++}`, tipo, dataVencimento: localDateStr(d), valor });
      d.setDate(d.getDate() + dias);
    }
  };

  if (diasVendas && diasVendas > 0 && valorVenda && valorVenda > 0)
    gerar('Vendas', diasVendas, valorVenda);
  if (diasArrendamentos && diasArrendamentos > 0 && valorArrendamento && valorArrendamento > 0)
    gerar('Arrendamentos', diasArrendamentos, valorArrendamento);

  return resultado.sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
}

function toParcelaReal(
  p: ParcelaDto,
  categoriaPorReceitaId: Map<string, string | null>,
  categoriaPorDespesaId: Map<string, string | null>,
): ParcelaReal {
  const categoria = p.receitaId
    ? categoriaPorReceitaId.get(p.receitaId) ?? null
    : p.despesaId
    ? categoriaPorDespesaId.get(p.despesaId) ?? null
    : null;
  return {
    id: p.id,
    tipo: p.receitaId ? 'receita' : 'despesa',
    dataVencimento: p.dataVencimento,
    valorLiquido: p.valorLiquido,
    nome: p.nome,
    categoria,
  };
}

function mesesDaPeriodicidade(p: Periodicidade): number {
  return p === 'Mensal' ? 1 : p === 'Trimestral' ? 3 : p === 'Semestral' ? 6 : 12;
}

// Aritmética de datas puramente em strings YYYY-MM-DD via UTC, sem bugs de timezone
function adicionarMesesStr(dateStr: string, meses: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + meses, d));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayStr(): string {
  return localDateStr(new Date());
}

function projetarDespesas(
  despesas: DespesaDto[],
  parcelasReaisDto: ParcelaDto[],
  contaId: string | null,
  horizonteMeses: number,
): DespesaProjetada[] {
  const hoje = todayStr();
  const horizonte = adicionarMesesStr(hoje, horizonteMeses);
  const resultado: DespesaProjetada[] = [];

  // Datas pendentes por despesaId (fonte fresca — evita projetar o que já existe na BD)
  const pendentesPorDespesa = new Map<string, Set<string>>();
  for (const p of parcelasReaisDto) {
    if (!p.despesaId) continue;
    if (!pendentesPorDespesa.has(p.despesaId)) pendentesPorDespesa.set(p.despesaId, new Set());
    pendentesPorDespesa.get(p.despesaId)!.add(p.dataVencimento);
  }

  const ativas = despesas.filter(d =>
    d.isActive &&
    (d.tipoDespesa === 'Fixa' || d.tipoDespesa === 'Recorrente') &&
    d.valorFixo != null &&
    d.periodicidade != null &&
    (contaId === null || d.contaId === contaId),
  );

  for (const despesa of ativas) {
    const meses = mesesDaPeriodicidade(despesa.periodicidade!);
    const pendentesDates = pendentesPorDespesa.get(despesa.id) ?? new Set<string>();

    // Combina parcelas do DTO (possivelmente desatualizadas) com as pendentes frescas
    const todasDatas = [
      ...despesa.parcelas.map(p => p.dataVencimento),
      ...pendentesDates,
    ];

    const valorMedio = despesa.parcelas.length > 0
      ? despesa.parcelas.reduce((s, p) => s + p.valorLiquido, 0) / despesa.parcelas.length
      : (despesa.valorFixo ?? 0);

    // Âncora: data seguinte ao máximo de todas as parcelas conhecidas
    let anchor: string;
    if (todasDatas.length > 0) {
      const maxDate = todasDatas.reduce((a, b) => (a > b ? a : b), todasDatas[0]);
      anchor = adicionarMesesStr(maxDate, meses);
    } else if (despesa.dataInicio) {
      anchor = despesa.dataInicio;
      while (anchor <= hoje)
        anchor = adicionarMesesStr(anchor, meses);
    } else {
      anchor = adicionarMesesStr(hoje, meses);
    }

    let idx = 0;
    let cur = anchor;
    while (cur <= horizonte) {
      // Só projeta datas futuras que ainda não existam como parcela pendente real
      if (cur > hoje && !pendentesDates.has(cur))
        resultado.push({
          id: `despesa-proj-${despesa.id}-${idx++}`,
          nome: despesa.nome,
          dataVencimento: cur,
          valor: valorMedio,
          categoria: despesa.categoria,
        });
      cur = adicionarMesesStr(cur, meses);
    }
  }

  return resultado.sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
}

function buildChartData(
  saldoAtual: number,
  parcelasGeradas: ParcelaGerada[],
  parcelasReais: ParcelaReal[],
  despesasProjetadas: DespesaProjetada[],
  horizonteMeses: Horizonte,
) {
  const hoje = new Date();
  return Array.from({ length: horizonteMeses }, (_, i) => {
    const mes = new Date(hoje.getFullYear(), hoje.getMonth() + i + 1, 1);
    const label = mes.toLocaleString('pt-PT', { month: 'short', year: '2-digit' });
    const fimMes = localDateStr(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));

    const saldoOrganico = saldoAtual
      + parcelasReais.filter(p => p.tipo === 'receita' && p.dataVencimento <= fimMes).reduce((s, p) => s + p.valorLiquido, 0)
      - parcelasReais.filter(p => p.tipo === 'despesa' && p.dataVencimento <= fimMes).reduce((s, p) => s + p.valorLiquido, 0)
      - despesasProjetadas.filter(p => p.dataVencimento <= fimMes).reduce((s, p) => s + p.valor, 0);

    const saldoComPrevisao = saldoOrganico
      + parcelasGeradas.filter(p => p.dataVencimento <= fimMes).reduce((s, p) => s + p.valor, 0);

    return { mes: label, organico: Math.round(saldoOrganico), simulado: Math.round(saldoComPrevisao) };
  });
}

// ── componente principal ──────────────────────────────────────────────────────

export function SimulationView({ isActive }: { isActive: boolean }) {
  const toast = useToast();

  const [contas, setContas] = useState<ContaDto[]>([]);
  const [selectedContaId, setSelectedContaId] = useState<string>(GLOBAL_ID);
  const [previsoes, setPrevisoes] = useState<PrevisaoDto[]>([]);
  const [activePrevisao, setActivePrevisao] = useState<PrevisaoDto | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PrevisaoDto | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [parcelasReaisDto, setParcelasReaisDto] = useState<ParcelaDto[]>([]);
  const [despesas, setDespesas] = useState<DespesaDto[]>([]);
  const [receitas, setReceitas] = useState<ReceitaDto[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');

  const [form, setForm] = useState<FormState>({
    nome: '', diasEntreVendas: '', valorMedioVenda: '', diasEntreArrendamentos: '', valorMedioArrendamento: '',
  });
  const [horizonte, setHorizonte] = useState<Horizonte>(6);
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  const isGlobal = selectedContaId === GLOBAL_ID;
  const conta = isGlobal ? null : contas.find(c => c.id === selectedContaId);

  // Re-carregar contas e despesas sempre que a aba fica visível
  useEffect(() => {
    if (!isActive) return;
    api.contas.listar().then(setContas).catch(() => {});
    api.despesas.listar().then(setDespesas).catch(() => {});
    api.receitas.listar().then(setReceitas).catch(() => {});
  }, [isActive]);

  // Carregar previsões quando a conta muda
  useEffect(() => {
    const contaIdParam = isGlobal ? undefined : selectedContaId;
    api.previsoes.listar(contaIdParam).then(ps => {
      setPrevisoes(ps);
      if (ps.length > 0) carregarPrevisao(ps[0]);
      else { setActivePrevisao(null); setIsEditing(true); setForm({ nome: '', diasEntreVendas: '', valorMedioVenda: '', diasEntreArrendamentos: '', valorMedioArrendamento: '' }); }
    }).catch(() => {});

    // Parcelas reais pendentes (não-global: direto; global: após contas carregarem)
    if (!isGlobal) {
      api.parcelas.listarPorConta(selectedContaId, true)
        .then(setParcelasReaisDto)
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContaId]);

  // Caso global: carrega parcelas de todas as contas quando contas ficam disponíveis
  useEffect(() => {
    if (!isGlobal || contas.length === 0) return;
    Promise.all(contas.map(c => api.parcelas.listarPorConta(c.id, true)))
      .then(results => setParcelasReaisDto(results.flat()))
      .catch(() => {});
  }, [contas, isGlobal]);

  function carregarPrevisao(p: PrevisaoDto) {
    setActivePrevisao(p);
    setIsEditing(false);
    setForm({
      nome: p.nome,
      diasEntreVendas: p.diasEntreVendas?.toString() ?? '',
      valorMedioVenda: p.valorMedioVenda?.toString() ?? '',
      diasEntreArrendamentos: p.diasEntreArrendamentos?.toString() ?? '',
      valorMedioArrendamento: p.valorMedioArrendamento?.toString() ?? '',
    });
  }

  const formTemDados = form.nome.trim() !== ''
    || form.diasEntreVendas !== ''
    || form.valorMedioVenda !== ''
    || form.diasEntreArrendamentos !== ''
    || form.valorMedioArrendamento !== '';

  function handleClickNova() {
    if (isEditing && formTemDados) { setShowDiscardDialog(true); return; }
    handleNovaPrevisao();
  }

  function handleNovaPrevisao() {
    setActivePrevisao(null);
    setIsEditing(true);
    setForm({ nome: '', diasEntreVendas: '', valorMedioVenda: '', diasEntreArrendamentos: '', valorMedioArrendamento: '' });
  }

  async function handleSave() {
    if (!form.nome.trim()) return;
    setIsSaving(true);
    try {
      const body = {
        nome: form.nome.trim(),
        contaId: isGlobal ? null : selectedContaId,
        diasEntreVendas: form.diasEntreVendas ? parseInt(form.diasEntreVendas) : null,
        valorMedioVenda: form.valorMedioVenda ? parseFloat(form.valorMedioVenda) : null,
        diasEntreArrendamentos: form.diasEntreArrendamentos ? parseInt(form.diasEntreArrendamentos) : null,
        valorMedioArrendamento: form.valorMedioArrendamento ? parseFloat(form.valorMedioArrendamento) : null,
      };
      if (activePrevisao) {
        await api.previsoes.atualizar(activePrevisao.id, body);
        const updated: PrevisaoDto = { ...activePrevisao, ...body };
        setPrevisoes(ps => ps.map(p => p.id === activePrevisao.id ? updated : p));
        setActivePrevisao(updated);
      } else {
        const { id } = await api.previsoes.criar(body);
        const nova: PrevisaoDto = { id, criadoEm: new Date().toISOString(), ...body };
        setPrevisoes(ps => [nova, ...ps]);
        setActivePrevisao(nova);
      }
      setIsEditing(false);
      toast('Previsão guardada com sucesso');
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Erro ao guardar previsão');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.previsoes.remover(deleteTarget.id);
      const restantes = previsoes.filter(p => p.id !== deleteTarget.id);
      setPrevisoes(restantes);
      if (activePrevisao?.id === deleteTarget.id) {
        if (restantes.length > 0) carregarPrevisao(restantes[0]);
        else { setActivePrevisao(null); setIsEditing(true); setForm({ nome: '', diasEntreVendas: '', valorMedioVenda: '', diasEntreArrendamentos: '', valorMedioArrendamento: '' }); }
      }
      toast('Previsão eliminada');
    } catch { toast('Erro ao eliminar previsão'); }
    finally { setDeleteTarget(null); }
  }

  // ── dados derivados ───────────────────────────────────────────────────────

  const parcelasGeradas = useMemo(() => gerarParcelas(
    form.diasEntreVendas ? parseInt(form.diasEntreVendas) : null,
    form.valorMedioVenda ? parseFloat(form.valorMedioVenda) : null,
    form.diasEntreArrendamentos ? parseInt(form.diasEntreArrendamentos) : null,
    form.valorMedioArrendamento ? parseFloat(form.valorMedioArrendamento) : null,
    horizonte,
  ), [form, horizonte]);

  const categoriaPorReceitaId = useMemo(
    () => new Map(receitas.map(r => [r.id, r.categoria] as const)),
    [receitas],
  );
  const categoriaPorDespesaId = useMemo(
    () => new Map(despesas.map(d => [d.id, d.categoria] as const)),
    [despesas],
  );

  const parcelasReais = useMemo(
    () => parcelasReaisDto.map(p => toParcelaReal(p, categoriaPorReceitaId, categoriaPorDespesaId)),
    [parcelasReaisDto, categoriaPorReceitaId, categoriaPorDespesaId],
  );

  const despesasProjetadas = useMemo(
    () => projetarDespesas(despesas, parcelasReaisDto, isGlobal ? null : selectedContaId, horizonte),
    [despesas, parcelasReaisDto, isGlobal, selectedContaId, horizonte],
  );

  const saldoAtual = isGlobal
    ? contas.reduce((s, c) => s + c.saldo, 0)
    : (conta?.saldo ?? 0);

  const saldoProjetado = useMemo(() => {
    const receitasReaisAte = parcelasReais
      .filter(p => p.tipo === 'receita' && p.dataVencimento <= selectedDateStr)
      .reduce((s, p) => s + p.valorLiquido, 0);
    const despesasReaisAte = parcelasReais
      .filter(p => p.tipo === 'despesa' && p.dataVencimento <= selectedDateStr)
      .reduce((s, p) => s + p.valorLiquido, 0);
    const geradasAte = parcelasGeradas
      .filter(p => p.dataVencimento <= selectedDateStr)
      .reduce((s, p) => s + p.valor, 0);
    const despProjAte = despesasProjetadas
      .filter(p => p.dataVencimento <= selectedDateStr)
      .reduce((s, p) => s + p.valor, 0);
    return saldoAtual + receitasReaisAte - despesasReaisAte + geradasAte - despProjAte;
  }, [saldoAtual, parcelasReais, parcelasGeradas, despesasProjetadas, selectedDateStr]);

  const delta = saldoProjetado - saldoAtual;

  // Atividade do dia selecionado
  const atividadeDoDia = useMemo(() => ({
    geradas: parcelasGeradas.filter(p => p.dataVencimento === selectedDateStr),
    reais: parcelasReais.filter(p => p.dataVencimento === selectedDateStr),
    despesasProj: despesasProjetadas.filter(p => p.dataVencimento === selectedDateStr),
  }), [parcelasGeradas, parcelasReais, despesasProjetadas, selectedDateStr]);

  const temAtividade = atividadeDoDia.geradas.length > 0 || atividadeDoDia.reais.length > 0 || atividadeDoDia.despesasProj.length > 0;

  function handleFiltroTipoChange(v: string) {
    setFiltroTipo(v as 'todos' | 'receita' | 'despesa');
    setFiltroCategoria('todas');
  }

  const categoriasFiltro = filtroTipo === 'receita'
    ? CATEGORIAS_RECEITA.map(c => ({ value: c, label: CATEGORIA_RECEITA_LABELS[c] }))
    : filtroTipo === 'despesa'
    ? CATEGORIAS.map(c => ({ value: c, label: CATEGORIA_LABELS[c] }))
    : [];

  function passaFiltro(tipo: 'receita' | 'despesa', categoria: string | null): boolean {
    if (filtroTipo !== 'todos' && filtroTipo !== tipo) return false;
    if (filtroCategoria !== 'todas' && categoria !== filtroCategoria) return false;
    return true;
  }

  const atividadeFiltrada = useMemo(() => ({
    geradas: atividadeDoDia.geradas.filter(p => passaFiltro('receita', p.tipo)),
    reais: atividadeDoDia.reais.filter(p => passaFiltro(p.tipo, p.categoria)),
    despesasProj: atividadeDoDia.despesasProj.filter(p => passaFiltro('despesa', p.categoria)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [atividadeDoDia, filtroTipo, filtroCategoria]);

  const temAtividadeFiltrada = atividadeFiltrada.geradas.length > 0 || atividadeFiltrada.reais.length > 0 || atividadeFiltrada.despesasProj.length > 0;

  const chartData = useMemo(
    () => buildChartData(saldoAtual, parcelasGeradas, parcelasReais, despesasProjetadas, horizonte),
    [saldoAtual, parcelasGeradas, parcelasReais, despesasProjetadas, horizonte],
  );

  const fmtEur = (v: number) => `€${v.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
  const fmtSigned = (v: number) => `${v >= 0 ? '+' : ''}${fmtEur(v)}`;

  return (
    <div className="h-full overflow-auto bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-blue-700 text-white px-6 py-4 shadow-md border-b-2 border-blue-800">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6" />
          <div>
            <h2 className="text-xl font-semibold">Modo Simulação</h2>
            <p className="text-sm text-blue-200">Inclui receitas e despesas pendentes + previsão</p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Conta selector */}
        <div>
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Conta</Label>
          <Select value={selectedContaId} onValueChange={setSelectedContaId}>
            <SelectTrigger className="w-full max-w-md h-11 border-slate-200">
              <SelectValue placeholder="Selecionar conta…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GLOBAL_ID}>
                Todas as contas (agregado) — {fmtEur(contas.reduce((s, c) => s + c.saldo, 0))}
              </SelectItem>
              {contas.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome} — {fmtEur(c.saldo)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* ── Coluna esquerda ── */}
          <div className="space-y-4">

            {/* Previsões guardadas */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Previsões ({previsoes.length})
                </h3>
                <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={handleClickNova}>
                  <Plus className="w-3 h-3 mr-1" />Nova
                </Button>
              </div>
              {previsoes.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {previsoes.map(p => (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      className={`flex items-center justify-between px-5 py-3 cursor-pointer transition-colors ${activePrevisao?.id === p.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                      onClick={() => carregarPrevisao(p)}
                      onKeyDown={e => e.key === 'Enter' && carregarPrevisao(p)}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{p.nome}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDate(p.criadoEm.split('T')[0])}</p>
                      </div>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600" onClick={() => { carregarPrevisao(p); setIsEditing(true); }} aria-label="Editar"><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600" onClick={() => setDeleteTarget(p)} aria-label="Eliminar"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-4 text-sm text-slate-400">Nenhuma previsão guardada</p>
              )}
            </div>

            {/* Formulário */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {activePrevisao && !isEditing ? activePrevisao.nome : activePrevisao ? 'Editar previsão' : 'Nova previsão'}
                </h3>
                {activePrevisao && !isEditing && (
                  <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-3 h-3 mr-1" />Editar
                  </Button>
                )}
              </div>
              <div className={`p-5 space-y-4 ${!isEditing ? 'pointer-events-none opacity-70' : ''}`}>
                <div>
                  <Label htmlFor="prev-nome" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</Label>
                  <Input id="prev-nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Cenário base 2026" className="mt-1.5 border-slate-200 focus-visible:ring-indigo-400" disabled={!isEditing} />
                </div>
                <div className="border border-slate-100 rounded-lg p-3 space-y-3">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Vendas</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="dias-vendas" className="text-xs text-slate-500">Dias entre vendas</Label>
                      <Input id="dias-vendas" type="number" min="1" value={form.diasEntreVendas} onChange={e => setForm(f => ({ ...f, diasEntreVendas: e.target.value }))} placeholder="—" className="mt-1 border-slate-200 focus-visible:ring-indigo-400 tabular-nums" disabled={!isEditing} />
                    </div>
                    <div>
                      <Label htmlFor="valor-venda" className="text-xs text-slate-500">Valor médio (€)</Label>
                      <Input id="valor-venda" type="number" min="0" step="0.01" value={form.valorMedioVenda} onChange={e => setForm(f => ({ ...f, valorMedioVenda: e.target.value }))} placeholder="—" className="mt-1 border-slate-200 focus-visible:ring-indigo-400 tabular-nums" disabled={!isEditing} />
                    </div>
                  </div>
                </div>
                <div className="border border-slate-100 rounded-lg p-3 space-y-3">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Arrendamentos</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="dias-arr" className="text-xs text-slate-500">Dias entre arrendamentos</Label>
                      <Input id="dias-arr" type="number" min="1" value={form.diasEntreArrendamentos} onChange={e => setForm(f => ({ ...f, diasEntreArrendamentos: e.target.value }))} placeholder="—" className="mt-1 border-slate-200 focus-visible:ring-indigo-400 tabular-nums" disabled={!isEditing} />
                    </div>
                    <div>
                      <Label htmlFor="valor-arr" className="text-xs text-slate-500">Valor médio (€)</Label>
                      <Input id="valor-arr" type="number" min="0" step="0.01" value={form.valorMedioArrendamento} onChange={e => setForm(f => ({ ...f, valorMedioArrendamento: e.target.value }))} placeholder="—" className="mt-1 border-slate-200 focus-visible:ring-indigo-400 tabular-nums" disabled={!isEditing} />
                    </div>
                  </div>
                </div>
                {isEditing && (
                  <div className="flex gap-2 pt-1">
                    <Button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg" disabled={!form.nome.trim() || isSaving}>
                      <Save className="w-4 h-4 mr-2" />{isSaving ? 'A guardar…' : 'Guardar'}
                    </Button>
                    {(activePrevisao || previsoes.length > 0) && (
                      <Button variant="outline" className="rounded-lg" onClick={() => { if (activePrevisao) carregarPrevisao(activePrevisao); else setIsEditing(false); }} disabled={isSaving}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Horizonte */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Horizonte de projeção</span>
              <div className="flex gap-1">
                {HORIZONTES.map(h => (
                  <button key={h} onClick={() => setHorizonte(h)} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${horizonte === h ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {formatHorizonteLabel(h)}
                  </button>
                ))}
              </div>
            </div>

            {/* Parcelas geradas */}
            {parcelasGeradas.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Receitas previstas ({parcelasGeradas.length})
                  </h3>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parcelasGeradas.map(p => (
                        <TableRow key={p.id} className={p.dataVencimento === selectedDateStr ? 'bg-indigo-50' : ''}>
                          <TableCell className="text-sm tabular-nums">{formatDate(p.dataVencimento)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.tipo === 'Vendas' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {p.tipo}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-slate-700">{fmtEur(p.valor)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          {/* ── Coluna direita ── */}
          <div className="space-y-4">
            {/* Calendário */}
            <SimulationCalendar
              selectedDateStr={selectedDateStr}
              onSelect={setSelectedDateStr}
              parcelasGeradas={parcelasGeradas}
              parcelasReais={parcelasReais}
              despesasProjetadas={despesasProjetadas}
            />

            {/* Legenda do calendário */}
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="text-[11px] text-slate-500">Receita pendente</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[11px] text-slate-500">Despesa pendente</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border border-indigo-400" />
                <span className="text-[11px] text-slate-500">Venda prevista</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border border-emerald-400" />
                <span className="text-[11px] text-slate-500">Arrendamento previsto</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border border-red-400" />
                <span className="text-[11px] text-slate-500">Despesa recorrente/fixa</span>
              </div>
            </div>

            {/* Atividade do dia */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Atividade — {formatDate(selectedDateStr)}
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={filtroTipo} onValueChange={handleFiltroTipoChange}>
                    <SelectTrigger className="h-7 w-auto min-w-[110px] text-xs border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="receita">Receitas</SelectItem>
                      <SelectItem value="despesa">Despesas</SelectItem>
                    </SelectContent>
                  </Select>
                  {filtroTipo !== 'todos' && (
                    <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                      <SelectTrigger className="h-7 w-auto min-w-[110px] text-xs border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas as categorias</SelectItem>
                        {categoriasFiltro.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              {temAtividadeFiltrada ? (
                <>
                  {/* Receitas reais */}
                  {atividadeFiltrada.reais.filter(p => p.tipo === 'receita').map(p => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-2.5 border-b border-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                        <div>
                          <span className="text-sm text-slate-700">{p.nome ?? 'Receita'}</span>
                          <span className="ml-1.5 text-xs text-slate-400">pendente</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-blue-700">+{fmtEur(p.valorLiquido)}</span>
                    </div>
                  ))}
                  {/* Despesas reais */}
                  {atividadeFiltrada.reais.filter(p => p.tipo === 'despesa').map(p => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-2.5 border-b border-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                        <div>
                          <span className="text-sm text-slate-700">{p.nome ?? 'Despesa'}</span>
                          <span className="ml-1.5 text-xs text-slate-400">pendente</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-red-600">−{fmtEur(p.valorLiquido)}</span>
                    </div>
                  ))}
                  {/* Despesas recorrentes/fixas projetadas */}
                  {atividadeFiltrada.despesasProj.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-2.5 border-b border-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full border border-red-400 flex-shrink-0" />
                        <div>
                          <span className="text-sm text-slate-700">{p.nome}</span>
                          <span className="ml-1.5 text-xs text-slate-400">recorrente/fixa</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-red-500">−{fmtEur(p.valor)}</span>
                    </div>
                  ))}
                  {/* Receitas geradas pela previsão */}
                  {atividadeFiltrada.geradas.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-2.5 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full border flex-shrink-0 ${p.tipo === 'Vendas' ? 'border-indigo-400' : 'border-emerald-400'}`} />
                        <div>
                          <span className="text-sm text-slate-700">{p.tipo}</span>
                          <span className="ml-1.5 text-xs text-slate-400">previsto</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-slate-600">+{fmtEur(p.valor)}</span>
                    </div>
                  ))}
                  {/* Total do dia se > 1 item */}
                  {(atividadeFiltrada.reais.length + atividadeFiltrada.geradas.length + atividadeFiltrada.despesasProj.length) > 1 && (() => {
                    const totalDia =
                      atividadeFiltrada.reais.filter(p => p.tipo === 'receita').reduce((s, p) => s + p.valorLiquido, 0)
                      - atividadeFiltrada.reais.filter(p => p.tipo === 'despesa').reduce((s, p) => s + p.valorLiquido, 0)
                      - atividadeFiltrada.despesasProj.reduce((s, p) => s + p.valor, 0)
                      + atividadeFiltrada.geradas.reduce((s, p) => s + p.valor, 0);
                    return (
                      <div className="flex items-center justify-between px-5 py-2 bg-slate-50 border-t border-slate-100">
                        <span className="text-xs font-semibold text-slate-500">Total do dia</span>
                        <span className={`text-sm font-bold tabular-nums ${totalDia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {fmtSigned(totalDia)}
                        </span>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <p className="px-5 py-4 text-sm text-slate-400">
                  {temAtividade ? 'Sem atividade a corresponder ao filtro' : 'Sem atividade prevista neste dia'}
                </p>
              )}
            </div>

            {/* Saldo projetado */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-semibold text-slate-900">Saldo Projetado</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Saldo Atual</p>
                  <p className="text-2xl font-bold tabular-nums text-slate-900">{fmtEur(saldoAtual)}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-dashed border-slate-200" /></div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                      + tudo até {formatDate(selectedDateStr)}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-wider text-indigo-500 uppercase mb-1">Saldo Projetado</p>
                  <p className="text-3xl font-bold tabular-nums text-indigo-600">{fmtEur(saldoProjetado)}</p>
                </div>
                {delta !== 0 && (
                  <div className={`border rounded-xl p-3 ${delta >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <p className={`text-[11px] font-semibold tracking-wider uppercase mb-1 ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Variação Total
                    </p>
                    <p className={`text-xl font-bold tabular-nums ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtSigned(delta)}
                    </p>
                    <p className={`text-xs mt-0.5 tabular-nums ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {((delta / (saldoAtual || 1)) * 100).toFixed(1)}% sobre o saldo atual
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-1">Evolução do Saldo</h3>
          <p className="text-xs text-slate-500 mb-4">
            Próximos {formatHorizonteLabel(horizonte)} — orgânico inclui receitas/despesas pendentes; simulado adiciona previsão
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#94a3b8" interval={Math.max(0, Math.floor(horizonte / 12))} />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.97)', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px' }}
                formatter={(v) => typeof v === 'number' ? fmtEur(v) : ''}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} iconType="line" />
              <Line type="monotone" dataKey="organico" name="Orgânico (sem previsão)" stroke="#94a3b8" strokeWidth={2} dot={{ fill: '#94a3b8', r: 3 }} />
              <Line type="monotone" dataKey="simulado" name="Com previsão" stroke="#6366f1" strokeWidth={3} strokeDasharray="5 5" dot={{ fill: '#6366f1', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda informativa */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <ul className="text-xs text-indigo-700 space-y-1">
              <li>• Ponto cheio azul = receita pendente real; ponto cheio vermelho = despesa pendente real</li>
              <li>• Ponto vazio azul/verde = venda/arrendamento previsto; ponto vazio vermelho = despesa recorrente/fixa projetada</li>
              <li>• O saldo projetado inclui receitas e despesas pendentes + despesas fixas/recorrentes ativas futuras</li>
              <li>• A linha "Orgânico" mostra a evolução com os compromissos já existentes (sem novas receitas)</li>
            </ul>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={open => { if (!open) setDeleteTarget(null); }}
        title="Eliminar Previsão"
        description={`Tem a certeza que deseja eliminar "${deleteTarget?.nome}"?`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={showDiscardDialog}
        onOpenChange={open => { if (!open) setShowDiscardDialog(false); }}
        title="Descartar alterações?"
        description="Tem dados preenchidos que ainda não foram guardados. Deseja descartá-los e criar uma nova previsão?"
        confirmLabel="Descartar"
        onConfirm={() => { setShowDiscardDialog(false); handleNovaPrevisao(); }}
      />
    </div>
  );
}
