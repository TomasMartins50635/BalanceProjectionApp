import { useEffect, useState, useCallback } from 'react';

export interface UpdateInfo {
  version: string;
  body: string;
}

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function useUpdater() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

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
      const { relaunch } = await import('@tauri-apps/plugin-process');
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
        await relaunch();
      }
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    if (!isTauri) return false;
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (update) {
      setUpdateInfo({ version: update.version, body: update.body ?? '' });
      return true;
    }
    return false;
  }, []);

  const dismiss = useCallback(() => setUpdateInfo(null), []);

  return { updateInfo, isDownloading, progress, installUpdate, checkForUpdates, dismiss };
}
