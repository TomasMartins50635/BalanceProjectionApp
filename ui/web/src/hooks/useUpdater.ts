import { useEffect, useState, useCallback } from 'react';
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

  const installUpdate = useCallback(async () => {
    if (!isTauri) return;
    setIsDownloading(true);
    setProgress(0);
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        let downloaded = 0;
        let total = 0;
        await update.downloadAndInstall((event) => {
          if (event.event === 'Started') total = event.data.contentLength ?? 0;
          if (event.event === 'Progress') {
            downloaded += event.data.chunkLength;
            if (total > 0) setProgress(Math.round((downloaded / total) * 100));
          }
        });

        try {
          const resultado = await api.diagnostico.verificarConsistencia();
          if (temInconsistencias(resultado)) {
            setConsistencia(resultado);
          } else {
            await doRelaunch();
          }
        } catch {
          // Se a verificação falhar por algum motivo, não bloqueia a atualização instalada.
          await doRelaunch();
        }
      }
    } finally {
      setIsDownloading(false);
    }
  }, []);

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
      await doRelaunch();
    }
  }, [consistencia, toast]);

  const ignorarEReiniciar = useCallback(async () => {
    setConsistencia(null);
    await doRelaunch();
  }, []);

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
