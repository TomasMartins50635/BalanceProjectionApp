import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ParcelaGerada {
  id: string;
  tipo: 'Vendas' | 'Arrendamentos';
  dataVencimento: string;
  valor: number;
}

export interface ParcelaReal {
  id: string;
  tipo: 'receita' | 'despesa';
  dataVencimento: string;
  valorLiquido: number;
  nome: string | null;
}

export interface DespesaProjetada {
  id: string;
  nome: string;
  dataVencimento: string;
  valor: number;
}

interface CalendarDay {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isIncluded: boolean;
  vendasGeradas: number;
  arrendamentosGerados: number;
  receitasReais: number;
  despesasReais: number;
  despesasProjetadas: number;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface Props {
  selectedDateStr: string;
  onSelect: (dateStr: string) => void;
  parcelasGeradas: ParcelaGerada[];
  parcelasReais: ParcelaReal[];
  despesasProjetadas: DespesaProjetada[];
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function SimulationCalendar({ selectedDateStr, onSelect, parcelasGeradas, parcelasReais, despesasProjetadas }: Props) {
  const todayStr = localDateStr(new Date());
  const initial = new Date();
  const [displayYear, setDisplayYear] = useState(initial.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(initial.getMonth());

  const geradasByDate = useMemo(() => {
    const map = new Map<string, { vendas: number; arrendamentos: number }>();
    for (const p of parcelasGeradas) {
      const e = map.get(p.dataVencimento) ?? { vendas: 0, arrendamentos: 0 };
      if (p.tipo === 'Vendas') e.vendas++; else e.arrendamentos++;
      map.set(p.dataVencimento, e);
    }
    return map;
  }, [parcelasGeradas]);

  const reaisByDate = useMemo(() => {
    const map = new Map<string, { receitas: number; despesas: number }>();
    for (const p of parcelasReais) {
      const e = map.get(p.dataVencimento) ?? { receitas: 0, despesas: 0 };
      if (p.tipo === 'receita') e.receitas++; else e.despesas++;
      map.set(p.dataVencimento, e);
    }
    return map;
  }, [parcelasReais]);

  const despesasProjByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of despesasProjetadas)
      map.set(d.dataVencimento, (map.get(d.dataVencimento) ?? 0) + 1);
    return map;
  }, [despesasProjetadas]);

  const days = useMemo((): CalendarDay[] => {
    const first = new Date(displayYear, displayMonth, 1);
    const last = new Date(displayYear, displayMonth + 1, 0);
    const offset = (first.getDay() + 6) % 7;
    const result: CalendarDay[] = [];

    const push = (d: Date, isCurrent: boolean) => {
      const dateStr = localDateStr(d);
      const g = geradasByDate.get(dateStr);
      const r = reaisByDate.get(dateStr);
      result.push({
        date: d,
        dateStr,
        isCurrentMonth: isCurrent,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr,
        isIncluded: dateStr > todayStr && dateStr < selectedDateStr,
        vendasGeradas: g?.vendas ?? 0,
        arrendamentosGerados: g?.arrendamentos ?? 0,
        receitasReais: r?.receitas ?? 0,
        despesasReais: r?.despesas ?? 0,
        despesasProjetadas: despesasProjByDate.get(dateStr) ?? 0,
      });
    };

    for (let i = offset - 1; i >= 0; i--)
      push(new Date(displayYear, displayMonth, -i), false);
    for (let i = 1; i <= last.getDate(); i++)
      push(new Date(displayYear, displayMonth, i), true);
    const remaining = 42 - result.length;
    for (let i = 1; i <= remaining; i++)
      push(new Date(displayYear, displayMonth + 1, i), false);

    return result;
  }, [displayYear, displayMonth, selectedDateStr, todayStr, geradasByDate, reaisByDate, despesasProjByDate]);

  function prevMonth() {
    if (displayMonth === 0) { setDisplayMonth(11); setDisplayYear(y => y - 1); }
    else setDisplayMonth(m => m - 1);
  }
  function nextMonth() {
    if (displayMonth === 11) { setDisplayMonth(0); setDisplayYear(y => y + 1); }
    else setDisplayMonth(m => m + 1);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden select-none">
      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" aria-label="Mês anterior">
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
        <span className="text-sm font-semibold text-slate-800">
          {MONTHS[displayMonth]} {displayYear}
        </span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" aria-label="Próximo mês">
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {WEEKDAYS.map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const hasDots = day.vendasGeradas > 0 || day.arrendamentosGerados > 0 || day.receitasReais > 0 || day.despesasReais > 0 || day.despesasProjetadas > 0;
          return (
            <button
              key={day.dateStr}
              onClick={() => onSelect(day.dateStr)}
              className={[
                'relative flex flex-col items-center justify-start pt-1.5 pb-1 min-h-[52px]',
                'transition-colors border-b border-r border-slate-50',
                !day.isCurrentMonth && 'opacity-35',
                day.isSelected
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : day.isIncluded
                  ? 'bg-indigo-50 hover:bg-indigo-100'
                  : 'hover:bg-slate-50',
              ].filter(Boolean).join(' ')}
            >
              <span className={[
                'text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium leading-none',
                day.isSelected
                  ? 'text-white'
                  : day.isToday
                  ? 'text-indigo-600 ring-2 ring-inset ring-indigo-400'
                  : 'text-slate-700',
              ].join(' ')}>
                {day.date.getDate()}
              </span>

              {hasDots && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-[28px]">
                  {day.receitasReais > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${day.isSelected ? 'bg-blue-200' : 'bg-blue-600'}`} title="Receita real" />
                  )}
                  {day.despesasReais > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${day.isSelected ? 'bg-red-200' : 'bg-red-500'}`} title="Despesa real" />
                  )}
                  {day.vendasGeradas > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full border ${day.isSelected ? 'border-indigo-200' : 'border-indigo-400'}`} title="Venda prevista" />
                  )}
                  {day.arrendamentosGerados > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full border ${day.isSelected ? 'border-emerald-200' : 'border-emerald-400'}`} title="Arrendamento previsto" />
                  )}
                  {day.despesasProjetadas > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full border ${day.isSelected ? 'border-red-300' : 'border-red-400'}`} title="Despesa prevista" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-4 flex-wrap">
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
    </div>
  );
}
