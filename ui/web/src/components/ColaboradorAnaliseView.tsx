import { useState, useMemo } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportActionButtons } from '@/components/ReportActionButtons';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { TIPO_COLABORADOR_LABELS, TIPO_COMISSAO_LABELS, CATEGORIA_RECEITA_LABELS, CATEGORIAS_RECEITA } from '@/lib/types';
import type { TipoComissao, CategoriaReceita } from '@/lib/types';

const TIPOS_COMISSAO_FILTRO = (Object.keys(TIPO_COMISSAO_LABELS) as TipoComissao[]).filter(t => t !== 'Servico');
const CATEGORIAS_RECEITA_FILTRO = CATEGORIAS_RECEITA.filter(c => c !== 'Outros');

// ── helpers ────────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  `€${v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (s: string) =>
  new Date(s + (s.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('pt-PT');

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Preset = '1m' | '3m' | '6m' | '1y' | 'ytd' | 'month' | 'custom';

function presetRange(p: Preset): [string, string] {
  const today = new Date();
  const fim = toIsoDate(today);
  if (p === '1m') return [toIsoDate(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())), fim];
  if (p === '3m') return [toIsoDate(new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())), fim];
  if (p === '6m') return [toIsoDate(new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())), fim];
  if (p === '1y') return [toIsoDate(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())), fim];
  if (p === 'ytd') return [toIsoDate(new Date(today.getFullYear(), 0, 1)), fim];
  return [toIsoDate(new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())), fim];
}

function currentMonthValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(mesAno: string): [string, string] {
  const [ano, mes] = mesAno.split('-').map(Number);
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0);
  return [toIsoDate(inicio), toIsoDate(fim)];
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: '1m', label: '1 mês' },
  { id: '3m', label: '3 meses' },
  { id: '6m', label: '6 meses' },
  { id: '1y', label: '12 meses' },
  { id: 'ytd', label: 'Este ano' },
  { id: 'month', label: 'Mês específico' },
  { id: 'custom', label: 'Personalizado' },
];

// ── stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'slate' }: {
  label: string; value: string; sub?: string; color?: 'slate' | 'green' | 'amber' | 'indigo';
}) {
  const bg = { slate: 'bg-slate-50', green: 'bg-green-50', amber: 'bg-amber-50', indigo: 'bg-indigo-50' }[color];
  const text = { slate: 'text-slate-700', green: 'text-green-700', amber: 'text-amber-700', indigo: 'text-indigo-700' }[color];
  return (
    <div className={`rounded-xl border border-slate-200 p-4 ${bg}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${text}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────────

interface Props {
  colaboradorId: string;
  onBack: () => void;
}

export function ColaboradorAnaliseView({ colaboradorId, onBack }: Props) {
  const toast = useToast();
  const [preset, setPreset] = useState<Preset>('3m');
  const [customInicio, setCustomInicio] = useState(() => presetRange('3m')[0]);
  const [customFim, setCustomFim] = useState(() => presetRange('3m')[1]);
  const [mesEscolhido, setMesEscolhido] = useState(() => currentMonthValue());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtroTipoComissao, setFiltroTipoComissao] = useState<TipoComissao | 'todos'>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaReceita | 'todas'>('todas');

  const [inicio, fim] = useMemo<[string, string]>(() => {
    if (preset === 'custom') return [customInicio, customFim];
    if (preset === 'month') return monthRange(mesEscolhido);
    return presetRange(preset);
  }, [preset, customInicio, customFim, mesEscolhido]);

  const { data, loading, error } = useAsync(
    () => api.colaboradores.estatisticas(colaboradorId, inicio, fim),
    [colaboradorId, inicio, fim],
  );

  const receitasFiltradas = useMemo(() => (data?.receitas ?? []).filter(r =>
    (filtroTipoComissao === 'todos' || r.tipoComissao === filtroTipoComissao) &&
    (filtroCategoria === 'todas' || r.categoria === filtroCategoria)
  ), [data?.receitas, filtroTipoComissao, filtroCategoria]);

  const totaisFiltrados = useMemo(() => {
    const valorPorReceita = new Map<string, number>();
    let valorComissaoPaga = 0;
    let valorComissaoPendente = 0;
    for (const r of receitasFiltradas) {
      // Se participou mais que uma vez na mesma receita (ex: comissão de Venda + Angariação),
      // o valor da receita só conta uma vez — mas cada comissão continua a somar.
      if (!valorPorReceita.has(r.receitaId)) {
        valorPorReceita.set(r.receitaId, r.parcelas.reduce((s, p) => s + p.valorBruto, 0));
      }
      for (const p of r.parcelas) {
        if (p.isPaid) valorComissaoPaga += p.valorComissao;
        else valorComissaoPendente += p.valorComissao;
      }
    }
    const valorReceitas = [...valorPorReceita.values()].reduce((s, v) => s + v, 0);
    const valorComissoes = valorComissaoPaga + valorComissaoPendente;
    return { valorReceitas, valorComissoes, valorComissaoPaga, valorComissaoPendente, receitasDistintas: valorPorReceita.size };
  }, [receitasFiltradas]);

  const relatorioSubtitulo = useMemo(() => {
    if (!data) return '';
    const partes = [`Colaborador: ${data.nome}`, `Período: ${fmtDate(inicio)} — ${fmtDate(fim)}`];
    if (filtroTipoComissao !== 'todos') partes.push(`Tipo de comissão: ${TIPO_COMISSAO_LABELS[filtroTipoComissao]}`);
    if (filtroCategoria !== 'todas') partes.push(`Categoria: ${CATEGORIA_RECEITA_LABELS[filtroCategoria]}`);
    partes.push(`${receitasFiltradas.length} receita(s)`);
    return partes.join(' · ');
  }, [data, inicio, fim, filtroTipoComissao, filtroCategoria, receitasFiltradas.length]);

  const handleExportCsv = async () => {
    const headers = ['Receita', 'Tipo', 'Categoria', '%', 'Nº', 'Vencimento', 'Pagamento', 'Valor (€)', 'Comissão (€)', 'Estado'];
    const rows = receitasFiltradas.flatMap(r => r.parcelas.map(p => [
      r.receitaNome,
      TIPO_COMISSAO_LABELS[r.tipoComissao as TipoComissao] ?? r.tipoComissao,
      r.categoria ?? '—',
      r.percentagem,
      p.numero,
      fmtDate(p.dataVencimento),
      p.dataPagamento ? fmtDate(p.dataPagamento) : '—',
      p.valorBruto,
      p.valorComissao,
      p.isPaid ? 'Pago' : 'Pendente',
    ]));
    rows.push(['Total pago', '', '', '', '', '', '', '', totaisFiltrados.valorComissaoPaga, '']);
    rows.push(['Total pendente', '', '', '', '', '', '', '', totaisFiltrados.valorComissaoPendente, '']);
    try {
      await downloadCsv(`comissoes_${data?.nome ?? 'colaborador'}_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } catch (e) {
      toast(`Erro ao exportar CSV: ${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="px-4 md:px-5 pt-3.5 pb-3 border-b border-slate-100 bg-white shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            {data ? (
              <>
                <h2 className="text-base font-semibold text-slate-900 truncate">{data.nome}</h2>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${
                  data.tipo === 'Comercial' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {TIPO_COLABORADOR_LABELS[data.tipo]}
                </span>
              </>
            ) : (
              <div className="h-5 w-32 bg-slate-100 animate-pulse rounded" />
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto print:hidden">
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">

          {/* Date range selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Período</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    preset === p.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {preset === 'month' && (
              <div className="mt-3">
                <label className="text-xs text-slate-500">Mês</label>
                <input
                  type="month" value={mesEscolhido}
                  onChange={e => setMesEscolhido(e.target.value)}
                  className="mt-1 block h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}
            {preset === 'custom' && (
              <div className="flex gap-3 mt-3">
                <div>
                  <label className="text-xs text-slate-500">Início</label>
                  <input
                    type="date" value={customInicio}
                    onChange={e => setCustomInicio(e.target.value)}
                    className="mt-1 block h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Fim</label>
                  <input
                    type="date" value={customFim}
                    onChange={e => setCustomFim(e.target.value)}
                    className="mt-1 block h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
            )}
          </div>

          {error && <div className="text-center text-red-600 text-sm py-8">{error}</div>}

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />)}
            </div>
          )}

          {data && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard
                  label="Total histórico"
                  value={fmt(data.totalRecebidoGlobal)}
                  color="indigo"
                />
                <StatCard
                  label="Recebido no período"
                  value={fmt(data.totalRecebidoPeriodo)}
                  sub={`${data.parcelasPagasPeriodo} parcela(s) paga(s)`}
                  color="green"
                />
                <StatCard
                  label="Pendente"
                  value={fmt(data.totalPendente)}
                  sub={`${data.parcelasPendentes} parcela(s) por receber`}
                  color="amber"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Receitas"
                  value={String(data.receitasCount)}
                  sub="com comissão"
                />
                <StatCard
                  label="Vendas"
                  value={String(data.numeroVendas)}
                  sub="nº de vendas"
                />
                <StatCard
                  label="Arrendamentos"
                  value={String(data.numeroArrendamentos)}
                  sub="nº de arrendamentos"
                />
              </div>


              {/* Receitas list */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 flex-wrap">
                  <Receipt className="w-4 h-4 text-slate-400 shrink-0" />
                  <p className="text-sm font-semibold text-slate-700 shrink-0">Receitas com participação  </p>
                  <div className="inline-flex items-center rounded-full border border-slate-200 p-0.5 bg-slate-50 gap-0.5">
                    <button
                      onClick={() => setFiltroTipoComissao('todos')}
                      className={`px-2.5 h-6 rounded-full text-xs font-medium transition-colors ${filtroTipoComissao === 'todos' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Todos
                    </button>
                    {TIPOS_COMISSAO_FILTRO.map(t => (
                      <button
                        key={t}
                        onClick={() => setFiltroTipoComissao(t)}
                        className={`px-2.5 h-6 rounded-full text-xs font-medium transition-colors ${filtroTipoComissao === t ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {TIPO_COMISSAO_LABELS[t]}
                      </button>
                    ))}
                  </div>
                  <div className="inline-flex items-center rounded-full border border-slate-200 p-0.5 bg-slate-50 gap-0.5">
                    <button
                      onClick={() => setFiltroCategoria('todas')}
                      className={`px-2.5 h-6 rounded-full text-xs font-medium transition-colors ${filtroCategoria === 'todas' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Todas
                    </button>
                    {CATEGORIAS_RECEITA_FILTRO.map(c => (
                      <button
                        key={c}
                        onClick={() => setFiltroCategoria(c)}
                        className={`px-2.5 h-6 rounded-full text-xs font-medium transition-colors ${filtroCategoria === c ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {CATEGORIA_RECEITA_LABELS[c]}
                      </button>
                    ))}
                  </div>
                  <span className="ml-auto text-xs text-slate-400 shrink-0">{totaisFiltrados.receitasDistintas} receita(s)</span>
                  <ReportActionButtons onExportCsv={handleExportCsv} variant="compact" />
                </div>

                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/60 flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Total das receitas participadas:</span>
                    <span className="text-xs font-semibold text-slate-700 tabular-nums">{fmt(totaisFiltrados.valorReceitas)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Total de comissões:</span>
                    <span className="text-xs font-semibold text-indigo-600 tabular-nums">{fmt(totaisFiltrados.valorComissoes)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Total pago:</span>
                    <span className="text-xs font-semibold text-green-600 tabular-nums">{fmt(totaisFiltrados.valorComissaoPaga)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Total pendente:</span>
                    <span className="text-xs font-semibold text-amber-600 tabular-nums">{fmt(totaisFiltrados.valorComissaoPendente)}</span>
                  </div>
                </div>

                {receitasFiltradas.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-400">
                    {data.receitas.length > 0
                      ? 'Nenhuma receita corresponde ao filtro.'
                      : 'Nenhuma receita encontrada para este período.'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {receitasFiltradas.map((r, i) => {
                      // Chave composta: a mesma receita pode aparecer mais que uma vez se o
                      // colaborador tiver mais que uma comissão nela (ex: Venda + Angariação).
                      const rowKey = `${r.receitaId}-${r.tipoComissao}-${i}`;
                      const isExpanded = expandedId === rowKey;
                      const pagas = r.parcelas.filter(p => p.isPaid);
                      const pendentes = r.parcelas.filter(p => !p.isPaid);
                      return (
                        <div key={rowKey}>
                          <button
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                            onClick={() => setExpandedId(isExpanded ? null : rowKey)}
                          >
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                              : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-slate-800 truncate">{r.receitaNome}</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                                  {TIPO_COMISSAO_LABELS[r.tipoComissao as TipoComissao] ?? r.tipoComissao} · {r.percentagem}%
                                </span>
                                {r.categoria && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-500">
                                    {r.categoria}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {pagas.length} paga(s) · {pendentes.length} pendente(s)
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {r.recebidoPeriodo > 0 && (
                                <p className="text-sm font-semibold text-green-600 tabular-nums">{fmt(r.recebidoPeriodo)}</p>
                              )}
                              {r.pendente > 0 && (
                                <p className="text-xs text-amber-600 tabular-nums">{fmt(r.pendente)} pend.</p>
                              )}
                              {r.recebidoPeriodo === 0 && r.pendente === 0 && (
                                <p className="text-xs text-slate-300">—</p>
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="bg-slate-50/70 border-t border-slate-100 px-4 py-3">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-400 uppercase tracking-wide">
                                    <th className="text-left font-semibold pb-2 w-8">#</th>
                                    <th className="text-left font-semibold pb-2">Vencimento</th>
                                    <th className="text-left font-semibold pb-2 hidden sm:table-cell">Pagamento</th>
                                    <th className="text-right font-semibold pb-2">Valor</th>
                                    <th className="text-right font-semibold pb-2">Comissão</th>
                                    <th className="text-center font-semibold pb-2 w-16">Estado</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {r.parcelas.map(p => (
                                    <tr key={p.id} className={p.isPaid ? '' : 'opacity-60'}>
                                      <td className="py-1.5 tabular-nums text-slate-500">{p.numero}</td>
                                      <td className="py-1.5 tabular-nums text-slate-600">{fmtDate(p.dataVencimento)}</td>
                                      <td className="py-1.5 tabular-nums text-slate-600 hidden sm:table-cell">
                                        {p.dataPagamento ? fmtDate(p.dataPagamento) : '—'}
                                      </td>
                                      <td className="py-1.5 text-right tabular-nums text-slate-700">
                                        {fmt(p.valorBruto)}
                                      </td>
                                      <td className={`py-1.5 text-right tabular-nums font-semibold ${p.isPaid ? 'text-green-600' : 'text-amber-600'}`}>
                                        {fmt(p.valorComissao)}
                                      </td>
                                      <td className="py-1.5 text-center">
                                        {p.isPaid ? (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">Pago</span>
                                        ) : (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">Pend.</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t border-slate-200">
                                    <td colSpan={3} className="pt-2 hidden sm:table-cell" />
                                    <td colSpan={1} className="pt-2 sm:hidden" />
                                    <td className="pt-2 text-right text-slate-500 tabular-nums">
                                      {fmt(r.parcelas.reduce((s, p) => s + p.valorBruto, 0))}
                                    </td>
                                    <td className="pt-2 text-right font-bold tabular-nums text-slate-700">
                                      {fmt(r.parcelas.reduce((s, p) => s + p.valorComissao, 0))}
                                    </td>
                                    <td />
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Documento de impressão — construído do zero, não é um snapshot da tabela ── */}
      <div className="hidden print:block print-report px-8 py-6 text-black bg-white">
        <div className="text-center mb-6 pb-4 border-b-2 border-black">
          <h1 className="text-2xl font-bold tracking-wide">RELATÓRIO DE COMISSÕES</h1>
          <p className="text-sm mt-1.5">{relatorioSubtitulo}</p>
          <p className="text-xs text-gray-600 mt-1">Gerado em {new Date().toLocaleString('pt-PT')}</p>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6 pb-4 border-b border-gray-400">
          <div>
            <p className="text-[10px] uppercase text-gray-600">Total das receitas participadas</p>
            <p className="text-sm font-bold">{fmt(totaisFiltrados.valorReceitas)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-gray-600">Total de comissões</p>
            <p className="text-sm font-bold">{fmt(totaisFiltrados.valorComissoes)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-gray-600">Total pago</p>
            <p className="text-sm font-bold">{fmt(totaisFiltrados.valorComissaoPaga)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-gray-600">Total pendente</p>
            <p className="text-sm font-bold">{fmt(totaisFiltrados.valorComissaoPendente)}</p>
          </div>
        </div>

        {receitasFiltradas.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhuma receita corresponde aos filtros aplicados.</p>
        ) : (
          <>
            {receitasFiltradas.map((r, i) => {
              const subtotalValor = r.parcelas.reduce((s, p) => s + p.valorBruto, 0);
              const subtotalComissao = r.parcelas.reduce((s, p) => s + p.valorComissao, 0);
              return (
                <div key={`${r.receitaId}-${r.tipoComissao}-${i}`} className="mb-6" style={{ breakInside: 'avoid' }}>
                  <h2 className="text-sm font-bold border-b border-black pb-1 mb-2">
                    {r.receitaNome} — {TIPO_COMISSAO_LABELS[r.tipoComissao as TipoComissao] ?? r.tipoComissao} · {r.percentagem}%
                    {r.categoria ? ` · ${r.categoria}` : ''}
                  </h2>
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-gray-400 px-1.5 py-1 text-left">Nº</th>
                        <th className="border border-gray-400 px-1.5 py-1 text-left">Vencimento</th>
                        <th className="border border-gray-400 px-1.5 py-1 text-left">Pagamento</th>
                        <th className="border border-gray-400 px-1.5 py-1 text-right">Valor</th>
                        <th className="border border-gray-400 px-1.5 py-1 text-right">Comissão</th>
                        <th className="border border-gray-400 px-1.5 py-1 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.parcelas.map(p => (
                        <tr key={p.id} style={{ breakInside: 'avoid' }}>
                          <td className="border border-gray-400 px-1.5 py-1">{p.numero}</td>
                          <td className="border border-gray-400 px-1.5 py-1">{fmtDate(p.dataVencimento)}</td>
                          <td className="border border-gray-400 px-1.5 py-1">{p.dataPagamento ? fmtDate(p.dataPagamento) : '—'}</td>
                          <td className="border border-gray-400 px-1.5 py-1 text-right">{fmt(p.valorBruto)}</td>
                          <td className="border border-gray-400 px-1.5 py-1 text-right">{fmt(p.valorComissao)}</td>
                          <td className="border border-gray-400 px-1.5 py-1 text-center">{p.isPaid ? 'Pago' : 'Pendente'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold">
                        <td colSpan={3} className="border border-gray-400 px-1.5 py-1 text-right">Subtotal</td>
                        <td className="border border-gray-400 px-1.5 py-1 text-right">{fmt(subtotalValor)}</td>
                        <td className="border border-gray-400 px-1.5 py-1 text-right">{fmt(subtotalComissao)}</td>
                        <td className="border border-gray-400" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}

            <div className="pt-3 border-t-2 border-black text-sm space-y-1">
              <div className="flex justify-between">
                <span>Total pago</span>
                <span className="font-bold">{fmt(totaisFiltrados.valorComissaoPaga)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total pendente</span>
                <span className="font-bold">{fmt(totaisFiltrados.valorComissaoPendente)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-gray-400">
                <span>TOTAL GERAL</span>
                <span>{fmt(totaisFiltrados.valorComissoes)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
