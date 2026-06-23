import { useEffect, useState, useCallback } from 'react';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export interface SyncSettings {
  url: string;
  apiKey: string;
  lastUploadTime?: string;
  lastUploadMtime?: number;
}

export function useSync() {
  const [hasSyncNewer, setHasSyncNewer] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Verificar versão no arranque (após 3s para o sidecar iniciar)
  useEffect(() => {
    if (!isTauri) return;
    const timer = setTimeout(async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke<{ hasNewer: boolean }>('check_sync_version');
        setHasSyncNewer(result.hasNewer);
      } catch {
        // servidor inacessível — ignorar silenciosamente
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Interceptar fecho da janela
  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;

    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow()
        .onCloseRequested(async (event) => {
          let hasChanges = false;
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            hasChanges = await invoke<boolean>('has_unsynced_changes');
          } catch {
            return; // erro → fechar normalmente
          }

          if (!hasChanges) return;

          event.preventDefault();
          setCloseDialogOpen(true);
        })
        .then((fn) => { unlisten = fn; });
    });

    return () => unlisten?.();
  }, []);

  const handleCloseDecision = useCallback(async (upload: boolean) => {
    if (upload) {
      setIsUploading(true);
      setUploadError(null);
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('upload_db');
      } catch (e) {
        setIsUploading(false);
        setUploadError(e instanceof Error ? e.message : String(e));
        return; // manter o dialog aberto para o utilizador decidir
      }
      setIsUploading(false);
    }
    setCloseDialogOpen(false);
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  }, []);

  const uploadDb = useCallback(async (): Promise<void> => {
    setIsUploading(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('upload_db');
      setHasSyncNewer(false);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const getSyncSettings = useCallback(async (): Promise<SyncSettings> => {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<SyncSettings>('get_sync_settings');
  }, []);

  const saveSyncSettings = useCallback(async (settings: SyncSettings): Promise<void> => {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('save_sync_settings', { settings });
  }, []);

  return {
    hasSyncNewer,
    isUploading,
    uploadError,
    closeDialogOpen,
    handleCloseDecision,
    uploadDb,
    getSyncSettings,
    saveSyncSettings,
  };
}
