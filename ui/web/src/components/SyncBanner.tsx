import { CloudOff } from 'lucide-react';

interface Props {
  isUploading: boolean;
  isDownloading: boolean;
  onDownload: () => void;
  onDismiss: () => void;
}

export function SyncBanner({ isUploading, isDownloading, onDownload, onDismiss }: Props) {
  const busy = isUploading || isDownloading;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-amber-600 text-white text-sm flex-shrink-0">
      <div className="flex items-center gap-2">
        <CloudOff className="w-4 h-4 flex-shrink-0" />
        <span>O servidor tem uma versão mais recente da base de dados.</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onDownload}
          disabled={busy}
          className="px-2.5 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-default"
        >
          {isDownloading ? 'A obter…' : 'Obter do servidor'}
        </button>
        {!busy && (
          <button
            onClick={onDismiss}
            className="opacity-60 hover:opacity-100 transition-opacity leading-none"
            aria-label="Dispensar"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
