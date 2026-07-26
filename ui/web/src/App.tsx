import { useState, useCallback } from 'react';
import { LayoutDashboard, TrendingDown, TrendingUp, CreditCard, Sparkles, PieChart, Users, RefreshCw } from 'lucide-react';
import { OverviewView } from '@/components/OverviewView';
import { Dashboard } from '@/components/Dashboard';
import { ReceitaView } from '@/components/ReceitaView';
import { DespesaView } from '@/components/DespesaView';
import { FinanciamentoView } from '@/components/FinanciamentoView';
import { SimulationView } from '@/components/SimulationView';
import { ColaboradorView } from '@/components/ColaboradorView';
import { UpdateBanner } from '@/components/UpdateBanner';
import { ConsistenciaDialog } from '@/components/ConsistenciaDialog';
import { SyncBanner } from '@/components/SyncBanner';
import { SyncPanel } from '@/components/SyncPanel';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useUpdater } from '@/hooks/useUpdater';
import { useSync } from '@/hooks/useSync';

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
  const [simulationEverVisited, setSimulationEverVisited] = useState(false);
  const isSimulation = activeView === 'simulation';

  const {
    updateInfo, isDownloading, progress, installUpdate, checkForUpdates, dismiss,
    consistencia, isCorrigindo, corrigirEReiniciar, ignorarEReiniciar,
  } = useUpdater();
  const { hasSyncNewer, isUploading, isDownloading: isSyncDownloading, isChecking, uploadError, closeDialogOpen, handleCloseDecision, uploadDb, downloadDb, checkVersion, getSyncSettings, saveSyncSettings } = useSync();
  const [syncBannerDismissed, setSyncBannerDismissed] = useState(false);

  const handleNavigate = useCallback((view: View, id?: string) => {
    setHighlightId(id);
    setActiveView(view);
    if (view === 'simulation') setSimulationEverVisited(true);
  }, []);

  return (
    <div className="flex flex-col h-full">

      {/* ── Sync banner ─────────────────────────────────────────────────── */}
      {hasSyncNewer && !syncBannerDismissed && (
        <SyncBanner
          isUploading={isUploading}
          isDownloading={isSyncDownloading}
          onDownload={downloadDb}
          onDismiss={() => setSyncBannerDismissed(true)}
        />
      )}

      {/* ── Update banner ───────────────────────────────────────────────── */}
      {updateInfo && (
        <UpdateBanner
          version={updateInfo.version}
          isDownloading={isDownloading}
          progress={progress}
          onUpdate={installUpdate}
          onDismiss={dismiss}
        />
      )}


      {/* ── Consistência de dados pós-atualização ──────────────────────────── */}
      {consistencia && (
        <ConsistenciaDialog
          dados={consistencia}
          isCorrigindo={isCorrigindo}
          onCorrigir={corrigirEReiniciar}
          onIgnorar={ignorarEReiniciar}
        />
      )}

      {/* ── Close confirmation dialog ────────────────────────────────────── */}
      <ConfirmDialog
        open={closeDialogOpen}
        onOpenChange={() => {}}
        title="Alterações não sincronizadas"
        description={
          uploadError
            ? `Erro ao guardar no servidor: ${uploadError}\n\nQueres tentar novamente ou fechar sem guardar?`
            : 'Tens alterações que não foram guardadas no servidor. Queres guardar antes de fechar?'
        }
        confirmLabel={isUploading ? 'A guardar…' : uploadError ? 'Tentar novamente' : 'Guardar e fechar'}
        cancelLabel="Fechar sem guardar"
        onConfirm={() => handleCloseDecision(true)}
        onCancel={() => handleCloseDecision(false)}
        hideCancel={isUploading}
      />

      <div className="flex flex-col md:flex-row flex-1 min-h-0">

        {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
        <aside className={`hidden md:flex flex-col w-60 flex-shrink-0 border-r transition-colors ${isSimulation ? 'bg-blue-950 border-blue-900' : 'bg-slate-900 border-slate-800'} text-white`}>
          <div className={`flex items-center gap-3 px-4 py-4 border-b ${isSimulation ? 'border-blue-900' : 'border-slate-800'}`}>
            <img src="/app-icon.png" alt="" className="w-7 h-7 rounded-lg flex-shrink-0" />
            <div>
              <h1 className="text-sm font-semibold leading-tight">Gestão Financeira</h1>
              {isSimulation && <p className="text-[10px] text-blue-400 mt-0.5">Modo Simulação Ativo</p>}
            </div>
          </div>
          <nav className="py-3 flex flex-col flex-1">
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
              onClick={() => { const next = isSimulation ? 'overview' : 'simulation'; setActiveView(next); if (next === 'simulation') setSimulationEverVisited(true); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all border-l-2 ${
                isSimulation
                  ? 'bg-slate-800 text-amber-400 border-amber-500 pl-[14px]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-transparent pl-[14px]'
              }`}
            >
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{isSimulation ? 'Sair da Simulação' : 'Modo Simulação'}</span>
            </button>

            {/* ── Sync & update buttons ─────────────────────────────────── */}
            <div className="mt-auto flex flex-col gap-1 pb-2">
              <SyncPanel
                getSyncSettings={getSyncSettings}
                saveSyncSettings={saveSyncSettings}
                onUpload={uploadDb}
                onDownload={downloadDb}
                onCheck={checkVersion}
                isUploading={isUploading}
                isDownloading={isSyncDownloading}
                isChecking={isChecking}
              />
              <div className="px-4 flex items-center justify-between">
                <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
                  Atualização de software
                </span>
                <button
                  onClick={checkForUpdates}
                  title="Verificar atualizações"
                  className="flex items-center justify-center w-6 h-6 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors flex-shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </nav>
        </aside>

        {/* ── Mobile top header ───────────────────────────────────────────── */}
        <div className={`md:hidden flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b ${isSimulation ? 'bg-blue-950 border-blue-900' : 'bg-slate-900 border-slate-800'} text-white`}>
          <img src="/app-icon.png" alt="" className="w-6 h-6 rounded-md flex-shrink-0" />
          <h1 className="text-sm font-semibold flex-1">Gestão Financeira</h1>
          {isSimulation && <span className="text-[11px] text-amber-400 font-medium">Simulação ativa</span>}
          <button
            onClick={() => { const next = isSimulation ? 'overview' : 'simulation'; setActiveView(next); if (next === 'simulation') setSimulationEverVisited(true); }}
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
          {simulationEverVisited && (
            <div className={activeView === 'simulation' ? 'h-full' : 'hidden'}>
              <SimulationView isActive={activeView === 'simulation'} />
            </div>
          )}
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
    </div>
  );
}
