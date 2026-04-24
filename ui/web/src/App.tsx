import { useState, useCallback } from 'react';
import { LayoutDashboard, TrendingDown, TrendingUp, CreditCard, Sparkles, PieChart, Users } from 'lucide-react';
import { OverviewView } from '@/components/OverviewView';
import { Dashboard } from '@/components/Dashboard';
import { ReceitaView } from '@/components/ReceitaView';
import { DespesaView } from '@/components/DespesaView';
import { FinanciamentoView } from '@/components/FinanciamentoView';
import { SimulationView } from '@/components/SimulationView';
import { ColaboradorView } from '@/components/ColaboradorView';

type View = 'overview' | 'dashboard' | 'receitas' | 'despesas' | 'financiamentos' | 'colaboradores' | 'simulation';

const navItems: { id: View; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: 'overview',       label: 'Visão Geral',    shortLabel: 'Geral',      icon: PieChart },
  { id: 'dashboard',      label: 'Contas',          shortLabel: 'Contas',     icon: LayoutDashboard },
  { id: 'receitas',       label: 'Receitas',        shortLabel: 'Receitas',   icon: TrendingUp },
  { id: 'despesas',       label: 'Despesas',        shortLabel: 'Despesas',   icon: TrendingDown },
  { id: 'financiamentos', label: 'Financiamentos',  shortLabel: 'Financ.',    icon: CreditCard },
  { id: 'colaboradores',  label: 'Colaboradores',   shortLabel: 'Colab.',     icon: Users },
];

export default function App() {
  const [activeView, setActiveView] = useState<View>('overview');
  const [highlightId, setHighlightId] = useState<string | undefined>();
  const isSimulation = activeView === 'simulation';

  const handleNavigate = useCallback((view: View, id?: string) => {
    setHighlightId(id);
    setActiveView(view);
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-full">

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className={`hidden md:flex flex-col w-60 flex-shrink-0 border-r transition-colors ${isSimulation ? 'bg-blue-950 border-blue-900' : 'bg-slate-900 border-slate-800'} text-white`}>
        <div className={`flex items-center gap-3 px-4 py-4 border-b ${isSimulation ? 'border-blue-900' : 'border-slate-800'}`}>
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <div className="w-3 h-3 rounded-sm bg-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Gestão Financeira</h1>
            {isSimulation && <p className="text-[10px] text-blue-400 mt-0.5">Modo Simulação Ativo</p>}
          </div>
        </div>
        <nav className="py-3 flex flex-col">
          <div className="px-4 mb-2">
            <p className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Principal</p>
          </div>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all border-l-2 ${
                activeView === id
                  ? 'bg-slate-800 text-white border-indigo-500 pl-[14px]'
                  : isSimulation
                  ? 'text-blue-300 hover:bg-blue-900/50 hover:text-white border-transparent pl-[14px]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-transparent pl-[14px]'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
          <div className={`mx-4 my-3 border-t ${isSimulation ? 'border-blue-900' : 'border-slate-800'}`} />
          <button
            onClick={() => setActiveView(isSimulation ? 'overview' : 'simulation')}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all border-l-2 ${
              isSimulation
                ? 'bg-slate-800 text-amber-400 border-amber-500 pl-[14px]'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-transparent pl-[14px]'
            }`}
          >
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{isSimulation ? 'Sair da Simulação' : 'Modo Simulação'}</span>
          </button>
        </nav>
      </aside>

      {/* ── Mobile top header ───────────────────────────────────────────── */}
      <div className={`md:hidden flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b ${isSimulation ? 'bg-blue-950 border-blue-900' : 'bg-slate-900 border-slate-800'} text-white`}>
        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-sm bg-white" />
        </div>
        <h1 className="text-sm font-semibold flex-1">Gestão Financeira</h1>
        {isSimulation && <span className="text-[11px] text-amber-400 font-medium">Simulação ativa</span>}
        <button
          onClick={() => setActiveView(isSimulation ? 'overview' : 'simulation')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isSimulation
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isSimulation ? 'Sair' : 'Sim.'}
        </button>
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {activeView === 'overview'       && <OverviewView />}
        {activeView === 'dashboard'      && <Dashboard onNavigate={handleNavigate} />}
        {activeView === 'receitas'       && <ReceitaView highlightId={highlightId} onHighlightConsumed={() => setHighlightId(undefined)} />}
        {activeView === 'despesas'       && <DespesaView highlightId={highlightId} onHighlightConsumed={() => setHighlightId(undefined)} />}
        {activeView === 'financiamentos' && <FinanciamentoView />}
        {activeView === 'colaboradores'  && <ColaboradorView />}
        {activeView === 'simulation'     && <SimulationView />}
      </main>

      {/* ── Mobile bottom tab bar ───────────────────────────────────────── */}
      <nav className={`md:hidden fixed bottom-0 inset-x-0 z-50 border-t ${isSimulation ? 'bg-blue-950 border-blue-900' : 'bg-slate-900 border-slate-800'}`}>
        <div className="grid grid-cols-6">
          {navItems.map(({ id, shortLabel, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                activeView === id
                  ? isSimulation ? 'text-amber-400' : 'text-indigo-400'
                  : isSimulation ? 'text-blue-400 hover:text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${activeView === id ? isSimulation ? 'text-amber-400' : 'text-indigo-400' : ''}`} />
              {shortLabel}
            </button>
          ))}
        </div>
      </nav>

    </div>
  );
}
