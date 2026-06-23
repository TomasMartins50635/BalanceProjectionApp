import { useEffect, useState, useCallback } from 'react';
import { useToast } from './useToast';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export interface SyncSettings {
  url: string;
  apiKey: string;
  lastUploadTime?: string;
  lastUploadMtime?: number;
}

export function useSync() {
  const toast = useToast();
  const [hasSyncNewer, setHasSyncNewer] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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
            return;
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
        return;
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
      toast('Base de dados guardada no servidor.', 'success');
    } catch (e) {
      toast(`Erro ao guardar: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  const downloadDb = useCallback(async (): Promise<void> => {
    setIsDownloading(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('download_db');
      toast('Base de dados obtida. A recarregar…', 'success');
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      toast(`Erro ao obter: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setIsDownloading(false);
    }
  }, [toast]);

  const [isChecking, setIsChecking] = useState(false);

  const getSyncSettings = useCallback(async (): Promise<SyncSettings> => {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<SyncSettings>('get_sync_settings');
  }, []);

  const saveSyncSettings = useCallback(async (settings: SyncSettings): Promise<void> => {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('save_sync_settings', { settings });
  }, []);

  const checkVersion = useCallback(async (): Promise<void> => {
    setIsChecking(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<{ hasNewer: boolean }>('check_sync_version');
      setHasSyncNewer(result.hasNewer);
      toast(
        result.hasNewer
          ? 'Versão de dados mais recente.'
          : 'Dados atualizados.',
        result.hasNewer ? 'error' : 'success'
      );
    } catch (e) {
      toast(`Não foi possível ligar ao servidor: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setIsChecking(false);
    }
  }, [toast]);

  return {
    hasSyncNewer,
    isUploading,
    isDownloading,
    isChecking,
    uploadError,
    closeDialogOpen,
    handleCloseDecision,
    uploadDb,
    downloadDb,
    checkVersion,
    getSyncSettings,
    saveSyncSettings,
  };
}
