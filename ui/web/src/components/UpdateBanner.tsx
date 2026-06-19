interface Props {
  version: string;
  isDownloading: boolean;
  progress: number;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function UpdateBanner({ version, isDownloading, progress, onUpdate, onDismiss }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-indigo-600 text-white text-sm flex-shrink-0">
      <span>
        Versão <strong>{version}</strong> disponível
      </span>
      <div className="flex items-center gap-3 flex-shrink-0">
        {isDownloading ? (
          <span className="text-indigo-200">{progress}% a instalar…</span>
        ) : (
          <>
            <button
              onClick={onUpdate}
              className="bg-white text-indigo-600 px-3 py-0.5 rounded font-medium hover:bg-indigo-50 transition-colors"
            >
              Atualizar
            </button>
            <button
              onClick={onDismiss}
              className="opacity-60 hover:opacity-100 transition-opacity leading-none"
              aria-label="Dispensar"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}
