import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/dates';
import { SimulationCalendar } from './SimulationCalendar';
import type { ParcelaReal } from './SimulationCalendar';

type AtividadeItem = ParcelaReal & { isPaid: boolean };

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentMonthValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtMesAno(mesAno: string): string {
  const [ano, mes] = mesAno.split('-').map(Number);
  return new Date(ano, mes - 1, 1)
    .toLocaleString('pt-PT', { month: 'long', year: 'numeric' })
    .replace(/^./, c => c.toUpperCase());
}

export function OverviewView() {
  const { data: contas, loading: contasLoading, error: contasError } = useAsync(() => api.contas.listar(), []);
  const { data: receitas } = useAsync(() => api.receitas.listar(), []);
  const { data: despesas } = useAsync(() => api.despesas.listar(), []);
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);
  const [filtroReceita, setFiltroReceita] = useState(false);
  const [filtroDespesa, setFiltroDespesa] = useState(false);
  const [filtroPago, setFiltroPago] = useState(false);
  const [filtroPendente, setFiltroPendente] = useState(false);
  const [modoOverride, setModoOverride] = useState<'intervalo' | 'mesEspecifico' | null>(null);
  const [intervaloInicio, setIntervaloInicio] = useState(todayStr);
  const [intervaloFim, setIntervaloFim] = useState(todayStr);
  const [mesEscolhido, setMesEscolhido] = useState(currentMonthValue);

  const totalSaldo = useMemo(
    () => (contas ?? []).reduce((s, c) => s + c.saldo, 0),
    [contas],
  );

  const allPaidReceitasParcelas = useMemo(
    () => (receitas ?? []).flatMap(r => r.parcelas.filter(p => p.isPaid)),
    [receitas],
  );

  const allPaidDespesasParcelas = useMemo(
    () => (despesas ?? []).flatMap(d => d.parcelas.filter(p => p.isPaid)),
    [despesas],
  );

  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthReceitas = allPaidReceitasParcelas
    .filter(p => p.dataPagamento?.startsWith(currentMonthPrefix))
    .reduce((s, p) => s + p.valorLiquido, 0);
  const currentMonthDespesas = allPaidDespesasParcelas
    .filter(p => p.dataPagamento?.startsWith(currentMonthPrefix))
    .reduce((s, p) => s + p.valorLiquido, 0);
  const currentMonthNet = currentMonthReceitas - currentMonthDespesas;

  const parcelasReaisCalendario = useMemo((): AtividadeItem[] => {
    const deReceitas = (receitas ?? []).flatMap(r =>
      r.parcelas.map((p): AtividadeItem => ({
        id: p.id,
        tipo: 'receita',
        dataVencimento: p.dataPagamento ?? p.dataVencimento,
        valorLiquido: p.valorLiquido,
        nome: p.nome,
        categoria: r.categoria,
        isPaid: p.isPaid,
      })),
    );
    const deDespesas = (despesas ?? []).flatMap(d =>
      d.parcelas.map((p): AtividadeItem => ({
        id: p.id,
        tipo: 'despesa',
        dataVencimento: p.dataPagamento ?? p.dataVencimento,
        valorLiquido: p.valorLiquido,
        nome: p.nome,
        categoria: d.categoria,
        isPaid: p.isPaid,
      })),
    );
    return [...deReceitas, ...deDespesas];
  }, [receitas, despesas]);

  const atividadeDoDiaBruta = useMemo(
    () => parcelasReaisCalendario.filter(p => {
      if (modoOverride === 'intervalo') return p.dataVencimento >= intervaloInicio && p.dataVencimento <= intervaloFim;
      if (modoOverride === 'mesEspecifico') return p.dataVencimento.startsWith(mesEscolhido);
      return p.dataVencimento === selectedDateStr;
    }),
    [parcelasReaisCalendario, selectedDateStr, modoOverride, intervaloInicio, intervaloFim, mesEscolhido],
  );

  const semFiltroTipo = !filtroReceita && !filtroDespesa;
  const semFiltroEstado = !filtroPago && !filtroPendente;
  const atividadeDoDia = useMemo(
    () => atividadeDoDiaBruta.filter(p =>
      (semFiltroTipo || (filtroReceita && p.tipo === 'receita') || (filtroDespesa && p.tipo === 'despesa'))
      && (semFiltroEstado || (filtroPago && p.isPaid) || (filtroPendente && !p.isPaid)),
    ),
    [atividadeDoDiaBruta, semFiltroTipo, filtroReceita, filtroDespesa, semFiltroEstado, filtroPago, filtroPendente],
  );

  const fmtEur = (v: number) => `€${v.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;

  if (contasError) {
    return (
      <div className="p-6 text-center text-red-600">
        <p className="font-medium">Erro ao carregar dados</p>
        <p className="text-sm mt-1">{contasError}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 h-full overflow-auto">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900 mb-0.5">Visão Geral</h2>
        <p className="text-sm text-slate-400">Resumo consolidado de todas as contas e movimentações</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-indigo-600" />
            </div>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${currentMonthNet >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {currentMonthNet >= 0 ? '+' : ''}€{Math.abs(currentMonthNet).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Saldo Total</p>
          {contasLoading ? (
            <div className="h-9 w-36 bg-slate-100 animate-pulse rounded mt-1" />
          ) : (
            <p className="text-3xl font-bold text-slate-900 tabular-nums">
              €{totalSaldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">vs mês anterior</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Receitas Pagas</p>
          {receitas === null ? (
            <div className="h-9 w-36 bg-slate-100 animate-pulse rounded mt-1" />
          ) : (
            <p className="text-3xl font-bold text-green-600 tabular-nums">
              €{currentMonthReceitas.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Parcelas liquidadas este mês</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Despesas Pagas</p>
          {despesas === null ? (
            <div className="h-9 w-36 bg-slate-100 animate-pulse rounded mt-1" />
          ) : (
            <p className="text-3xl font-bold text-red-600 tabular-nums">
              €{currentMonthDespesas.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Parcelas pagas este mês</p>
        </div>
      </div>

      {/* Calendário */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <div className="space-y-2">
          <SimulationCalendar
            selectedDateStr={selectedDateStr}
            onSelect={d => { setSelectedDateStr(d); setModoOverride(null); }}
            parcelasGeradas={[]}
            parcelasReais={parcelasReaisCalendario}
            despesasProjetadas={[]}
          />
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-[11px] text-slate-500">Receita</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[11px] text-slate-500">Despesa</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-[420px] flex flex-col">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Atividade — {
                  modoOverride === 'intervalo' ? `${formatDate(intervaloInicio)} — ${formatDate(intervaloFim)}`
                  : modoOverride === 'mesEspecifico' ? fmtMesAno(mesEscolhido)
                  : formatDate(selectedDateStr)
                }
              </h4>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setModoOverride(v => v === 'intervalo' ? null : 'intervalo')}
                  className={`px-2.5 h-6 rounded-full text-xs font-medium border transition-colors ${
                    modoOverride === 'intervalo' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Intervalo
                </button>
                <button
                  type="button"
                  onClick={() => setModoOverride(v => v === 'mesEspecifico' ? null : 'mesEspecifico')}
                  className={`px-2.5 h-6 rounded-full text-xs font-medium border transition-colors ${
                    modoOverride === 'mesEspecifico' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Mês específico
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroReceita(v => !v)}
                  className={`px-2.5 h-6 rounded-full text-xs font-medium border transition-colors ${
                    filtroReceita ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Receita
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroDespesa(v => !v)}
                  className={`px-2.5 h-6 rounded-full text-xs font-medium border transition-colors ${
                    filtroDespesa ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Despesa
                </button>
                <span className="w-px h-4 bg-slate-200 mx-0.5" />
                <button
                  type="button"
                  onClick={() => setFiltroPago(v => !v)}
                  className={`px-2.5 h-6 rounded-full text-xs font-medium border transition-colors ${
                    filtroPago ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Pago
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroPendente(v => !v)}
                  className={`px-2.5 h-6 rounded-full text-xs font-medium border transition-colors ${
                    filtroPendente ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Pendente
                </button>
              </div>
            </div>
            {modoOverride === 'intervalo' && (
              <div className="flex items-center gap-2">
                <input
                  type="date" value={intervaloInicio}
                  onChange={e => setIntervaloInicio(e.target.value)}
                  className="h-8 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <span className="text-xs text-slate-400">até</span>
                <input
                  type="date" value={intervaloFim}
                  onChange={e => setIntervaloFim(e.target.value)}
                  className="h-8 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}
            {modoOverride === 'mesEspecifico' && (
              <div className="flex items-center gap-2">
                <input
                  type="month" value={mesEscolhido}
                  onChange={e => setMesEscolhido(e.target.value)}
                  className="h-8 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {atividadeDoDia.length > 0 ? (
              atividadeDoDia.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-2.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.tipo === 'receita' ? 'bg-blue-600' : 'bg-red-500'}`} />
                    <span className="text-sm text-slate-700 truncate">{p.nome ?? (p.tipo === 'receita' ? 'Receita' : 'Despesa')}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                      p.isPaid ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {p.isPaid ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums shrink-0 ml-2 ${p.tipo === 'receita' ? 'text-blue-700' : 'text-red-600'}`}>
                    {p.tipo === 'receita' ? '+' : '−'}{fmtEur(p.valorLiquido)}
                  </span>
                </div>
              ))
            ) : (
              <p className="px-5 py-4 text-sm text-slate-400">
                {atividadeDoDiaBruta.length > 0
                  ? 'Sem atividade a corresponder ao filtro'
                  : `Sem atividade prevista ${
                      modoOverride === 'mesEspecifico' ? 'neste mês'
                      : modoOverride === 'intervalo' ? 'neste período' : 'neste dia'
                    }`}
              </p>
            )}
          </div>
          {atividadeDoDia.length > 1 && (() => {
            const totalDia = atividadeDoDia.reduce((s, p) => s + (p.tipo === 'receita' ? p.valorLiquido : -p.valorLiquido), 0);
            return (
              <div className="flex items-center justify-between px-5 py-2 bg-slate-50 border-t border-slate-100 shrink-0">
                <span className="text-xs font-semibold text-slate-500">
                  {modoOverride === 'mesEspecifico' ? 'Total do mês'
                    : modoOverride === 'intervalo' ? 'Total do período' : 'Total do dia'}
                </span>
                <span className={`text-sm font-bold tabular-nums ${totalDia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalDia >= 0 ? '+' : ''}{fmtEur(totalDia)}
                </span>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
