import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/dates';
import { SimulationCalendar } from './SimulationCalendar';
import type { ParcelaReal } from './SimulationCalendar';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function OverviewView() {
  const { data: contas, loading: contasLoading, error: contasError } = useAsync(() => api.contas.listar(), []);
  const { data: receitas } = useAsync(() => api.receitas.listar(), []);
  const { data: despesas } = useAsync(() => api.despesas.listar(), []);
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);
  const [filtroReceita, setFiltroReceita] = useState(false);
  const [filtroDespesa, setFiltroDespesa] = useState(false);
  const [modoMes, setModoMes] = useState(false);

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

  const parcelasReaisCalendario = useMemo((): ParcelaReal[] => {
    const deReceitas = (receitas ?? []).flatMap(r =>
      r.parcelas.map((p): ParcelaReal => ({
        id: p.id,
        tipo: 'receita',
        dataVencimento: p.dataPagamento ?? p.dataVencimento,
        valorLiquido: p.valorLiquido,
        nome: p.nome,
        categoria: r.categoria,
      })),
    );
    const deDespesas = (despesas ?? []).flatMap(d =>
      d.parcelas.map((p): ParcelaReal => ({
        id: p.id,
        tipo: 'despesa',
        dataVencimento: p.dataPagamento ?? p.dataVencimento,
        valorLiquido: p.valorLiquido,
        nome: p.nome,
        categoria: d.categoria,
      })),
    );
    return [...deReceitas, ...deDespesas];
  }, [receitas, despesas]);

  const atividadeDoDiaBruta = useMemo(
    () => parcelasReaisCalendario.filter(p =>
      modoMes ? p.dataVencimento.startsWith(currentMonthPrefix) : p.dataVencimento === selectedDateStr,
    ),
    [parcelasReaisCalendario, selectedDateStr, modoMes, currentMonthPrefix],
  );

  const semFiltroTipo = !filtroReceita && !filtroDespesa;
  const atividadeDoDia = useMemo(
    () => atividadeDoDiaBruta.filter(p =>
      semFiltroTipo || (filtroReceita && p.tipo === 'receita') || (filtroDespesa && p.tipo === 'despesa'),
    ),
    [atividadeDoDiaBruta, semFiltroTipo, filtroReceita, filtroDespesa],
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
            onSelect={d => { setSelectedDateStr(d); setModoMes(false); }}
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

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Atividade — {modoMes ? now.toLocaleString('pt-PT', { month: 'long', year: 'numeric' }) : formatDate(selectedDateStr)}
            </h4>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setModoMes(v => !v)}
                className={`px-2.5 h-6 rounded-full text-xs font-medium border transition-colors ${
                  modoMes ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Este mês
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
            </div>
          </div>
          {atividadeDoDia.length > 0 ? (
            <>
              {atividadeDoDia.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-2.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.tipo === 'receita' ? 'bg-blue-600' : 'bg-red-500'}`} />
                    <span className="text-sm text-slate-700">{p.nome ?? (p.tipo === 'receita' ? 'Receita' : 'Despesa')}</span>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${p.tipo === 'receita' ? 'text-blue-700' : 'text-red-600'}`}>
                    {p.tipo === 'receita' ? '+' : '−'}{fmtEur(p.valorLiquido)}
                  </span>
                </div>
              ))}
              {atividadeDoDia.length > 1 && (() => {
                const totalDia = atividadeDoDia.reduce((s, p) => s + (p.tipo === 'receita' ? p.valorLiquido : -p.valorLiquido), 0);
                return (
                  <div className="flex items-center justify-between px-5 py-2 bg-slate-50 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-500">{modoMes ? 'Total do mês' : 'Total do dia'}</span>
                    <span className={`text-sm font-bold tabular-nums ${totalDia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {totalDia >= 0 ? '+' : ''}{fmtEur(totalDia)}
                    </span>
                  </div>
                );
              })()}
            </>
          ) : (
            <p className="px-5 py-4 text-sm text-slate-400">
              {atividadeDoDiaBruta.length > 0 ? 'Sem atividade a corresponder ao filtro' : `Sem atividade prevista ${modoMes ? 'neste mês' : 'neste dia'}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
