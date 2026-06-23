import { CloudOff } from 'lucide-react';

interface Props {
  isUploading: boolean;
  onDismiss: () => void;
}

export function SyncBanner({ isUploading, onDismiss }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-amber-600 text-white text-sm flex-shrink-0">
      <div className="flex items-center gap-2">
        <CloudOff className="w-4 h-4 flex-shrink-0" />
        <span>O servidor tem uma versão mais recente da base de dados.</span>
      </div>
      {!isUploading && (
        <button
          onClick={onDismiss}
          className="opacity-60 hover:opacity-100 transition-opacity leading-none flex-shrink-0"
          aria-label="Dispensar"
        >
          ✕
        </button>
      )}
    </div>
  );
}
