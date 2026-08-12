import { useEffect, useState, useCallback, useRef } from 'react';
import type { Update } from '@tauri-apps/plugin-updater';
import { useToast } from './useToast';
import { api } from '@/lib/api';
import type { ConsistenciaDto } from '@/lib/types';

export interface UpdateInfo {
  version: string;
  body: string;
}

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function doRelaunch() {
  if (!isTauri) return;
  const { relaunch } = await import('@tauri-apps/plugin-process');
  await relaunch();
}

function temInconsistencias(dto: ConsistenciaDto) {
  return dto.inconsistenciasIva.length > 0
    || dto.inconsistenciasComissao.length > 0
    || dto.inconsistenciasParcelaReceita.length > 0;
}

export function useUpdater() {
  const toast = useToast();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [consistencia, setConsistencia] = useState<ConsistenciaDto | null>(null);
  const [isCorrigindo, setIsCorrigindo] = useState(false);
  const pendingUpdateRef = useRef<Update | null>(null);

  useEffect(() => {
    if (!isTauri) return;

    let cleanup: (() => void) | undefined;
    import('@tauri-apps/api/event').then(({ listen }) => {
      const unlisten = listen<UpdateInfo>('update-available', (event) => {
        setUpdateInfo(event.payload);
      });
      cleanup = () => { unlisten.then(fn => fn()); };
    });

    return () => cleanup?.();
  }, []);

  // Mata o sidecar antes de instalar — caso contrário o processo api.exe em
  // execução mantém o ficheiro bloqueado e o instalador falha com
  // "Can't write: ...\api.exe".
  const finalizeInstall = useCallback(async (update: Update) => {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('kill_sidecar');
    await update.install();
    await doRelaunch();
  }, []);

  const installUpdate = useCallback(async () => {
    if (!isTauri) return;
    setIsDownloading(true);
    setProgress(0);
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (!update) return;

      let downloaded = 0;
      let total = 0;
      await update.download((event) => {
        if (event.event === 'Started') total = event.data.contentLength ?? 0;
        if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          if (total > 0) setProgress(Math.round((downloaded / total) * 100));
        }
      });

      try {
        const resultado = await api.diagnostico.verificarConsistencia();
        if (temInconsistencias(resultado)) {
          pendingUpdateRef.current = update;
          setConsistencia(resultado);
          return; // aguarda decisão do utilizador antes de instalar
        }
      } catch {
        // Se a verificação falhar por algum motivo, não bloqueia a atualização.
      }

      await finalizeInstall(update);
    } finally {
      setIsDownloading(false);
    }
  }, [finalizeInstall]);

  const corrigirEReiniciar = useCallback(async () => {
    if (!consistencia) return;
    setIsCorrigindo(true);
    try {
      await api.diagnostico.corrigir({
        receitaIds: consistencia.inconsistenciasIva.map(i => i.receitaId),
        comissoes: consistencia.inconsistenciasComissao.map(c => ({ colaboradorId: c.colaboradorId, mes: c.mes })),
      });
    } catch (e) {
      toast(`Erro ao corrigir inconsistências: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setIsCorrigindo(false);
      setConsistencia(null);
      const update = pendingUpdateRef.current;
      pendingUpdateRef.current = null;
      if (update) await finalizeInstall(update);
      else await doRelaunch();
    }
  }, [consistencia, toast, finalizeInstall]);

  const ignorarEReiniciar = useCallback(async () => {
    setConsistencia(null);
    const update = pendingUpdateRef.current;
    pendingUpdateRef.current = null;
    if (update) await finalizeInstall(update);
    else await doRelaunch();
  }, [finalizeInstall]);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    if (!isTauri) {
      toast('Atualização automática apenas disponível na app desktop.', 'error');
      return false;
    }
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        setUpdateInfo({ version: update.version, body: update.body ?? '' });
        toast('Versão de software mais recente.', 'error');
        return true;
      }
      toast('Software atualizado.', 'success');
      return false;
    } catch (e) {
      toast(`Erro ao verificar atualizações: ${e instanceof Error ? e.message : String(e)}`, 'error');
      return false;
    }
  }, [toast]);

  const dismiss = useCallback(() => setUpdateInfo(null), []);

  return {
    updateInfo, isDownloading, progress, installUpdate, checkForUpdates, dismiss,
    consistencia, isCorrigindo, corrigirEReiniciar, ignorarEReiniciar,
  };
}
