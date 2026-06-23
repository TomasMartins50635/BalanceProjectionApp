import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowUp, ArrowDown, RotateCcw, Settings } from 'lucide-react';
import type { SyncSettings } from '@/hooks/useSync';

interface Props {
  getSyncSettings: () => Promise<SyncSettings>;
  saveSyncSettings: (s: SyncSettings) => Promise<void>;
  onUpload: () => Promise<void>;
  onDownload: () => Promise<void>;
  onCheck: () => Promise<void>;
  isUploading: boolean;
  isDownloading: boolean;
  isChecking: boolean;
}

export function SyncPanel({
  getSyncSettings,
  saveSyncSettings,
  onUpload,
  onDownload,
  onCheck,
  isUploading,
  isDownloading,
  isChecking,
}: Props) {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSyncSettings()
      .then(s => { setUrl(s.url); setApiKey(s.apiKey); })
      .catch(() => {});
  }, [getSyncSettings]);

  const persist = useCallback(
    (nextUrl: string, nextKey: string) =>
      saveSyncSettings({ url: nextUrl, apiKey: nextKey }).catch(() => {}),
    [saveSyncSettings],
  );

  // Fecha ao clicar fora
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        persist(url, apiKey);
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded, url, apiKey, persist]);

  const btnCls =
    'flex items-center justify-center w-6 h-6 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-default flex-shrink-0';

  return (
    <div ref={panelRef} className="px-4 pb-3">
      {/* Label + botões na mesma linha */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
          Servidor
        </span>
        <button
          onClick={onUpload}
          disabled={isUploading}
          title="Guardar no servidor"
          className={btnCls}
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDownload}
          disabled={isDownloading}
          title="Obter do servidor"
          className={btnCls}
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onCheck}
          disabled={isChecking}
          title="Verificar versão"
          className={btnCls}
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={() => setExpanded(v => !v)}
          title="Configurar servidor"
          className={`${btnCls} ${expanded ? 'text-indigo-400' : ''}`}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fields colapsáveis */}
      {expanded && (
        <div className="mt-2 flex flex-col gap-1">
          <input
            autoFocus
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://servidor..."
            className="w-full bg-slate-800 text-slate-200 text-[11px] px-2 py-1 rounded border border-slate-700 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="API Key"
            className="w-full bg-slate-800 text-slate-200 text-[11px] px-2 py-1 rounded border border-slate-700 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}
    </div>
  );
}
