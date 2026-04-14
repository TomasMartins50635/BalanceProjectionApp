import { useState } from 'react';
import { LayoutDashboard, TrendingDown, TrendingUp, CreditCard, Sparkles, PieChart, Users } from 'lucide-react';
import { OverviewView } from '@/components/OverviewView';
import { Dashboard } from '@/components/Dashboard';
import { ReceitaView } from '@/components/ReceitaView';
import { DespesaView } from '@/components/DespesaView';
import { FinanciamentoView } from '@/components/FinanciamentoView';
import { SimulationView } from '@/components/SimulationView';
import { ColaboradorView } from '@/components/ColaboradorView';

type View = 'overview' | 'dashboard' | 'receitas' | 'despesas' | 'financiamentos' | 'colaboradores' | 'simulation';

const navItems = [
  { id: 'overview' as View, label: 'Visão Geral', icon: PieChart },
  { id: 'dashboard' as View, label: 'Contas', icon: LayoutDashboard },
  { id: 'receitas' as View, label: 'Receitas/Faturação', icon: TrendingUp },
  { id: 'despesas' as View, label: 'Despesas', icon: TrendingDown },
  { id: 'financiamentos' as View, label: 'Financiamentos', icon: CreditCard },
  { id: 'colaboradores' as View, label: 'Colaboradores', icon: Users },
];

export default function App() {
  const [activeView, setActiveView] = useState<View>('overview');
  const isSimulation = activeView === 'simulation';

  return (
    <div className="flex flex-col md:flex-row h-full bg-gray-50">
      <aside className={`w-full md:w-56 flex-shrink-0 border-b md:border-b-0 md:border-r transition-colors ${isSimulation ? 'bg-blue-900 border-blue-800' : 'bg-slate-800 border-slate-700'} text-white`}>
        <div className={`px-4 py-3 md:py-5 border-b transition-colors ${isSimulation ? 'border-blue-800' : 'border-slate-700'}`}>
          <h1 className="text-base md:text-lg font-semibold">Sistema Financeiro</h1>
          {isSimulation && <p className="text-xs text-blue-300 mt-1">Modo Simulação Ativo</p>}
        </div>
        <nav className="py-2 md:py-3 flex md:flex-col overflow-x-auto md:overflow-x-visible">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`flex-shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm transition-colors whitespace-nowrap ${
                activeView === id
                  ? 'bg-blue-600 text-white'
                  : isSimulation
                  ? 'text-blue-200 hover:bg-blue-800 hover:text-white'
                  : 'text-gray-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
          <div className={`hidden md:block mx-4 my-3 border-t transition-colors ${isSimulation ? 'border-blue-800' : 'border-slate-700'}`} />
          <button
            onClick={() => setActiveView(isSimulation ? 'overview' : 'simulation')}
            className={`flex-shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm transition-all whitespace-nowrap ${
              isSimulation ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium hidden sm:inline">{isSimulation ? 'Sair da Simulação' : 'Modo Simulação'}</span>
          </button>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        {activeView === 'overview' && <OverviewView />}
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'receitas' && <ReceitaView />}
        {activeView === 'despesas' && <DespesaView />}
        {activeView === 'financiamentos' && <FinanciamentoView />}
        {activeView === 'colaboradores' && <ColaboradorView />}
        {activeView === 'simulation' && <SimulationView />}
      </main>
    </div>
  );
}
