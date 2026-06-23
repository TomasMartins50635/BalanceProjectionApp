import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SyncSettings } from '@/hooks/useSync';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: () => Promise<SyncSettings>;
  onSave: (settings: SyncSettings) => Promise<void>;
}

export function SyncSettingsDialog({ open, onOpenChange, onLoad, onSave }: Props) {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    onLoad().then((s) => {
      setUrl(s.url ?? '');
      setApiKey(s.apiKey ?? '');
    });
  }, [open, onLoad]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ url: url.trim(), apiKey: apiKey.trim() });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Configurações de Sincronização</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sync-url">URL do servidor</Label>
            <Input
              id="sync-url"
              placeholder="https://servidor:5536"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sync-key">API Key</Label>
            <Input
              id="sync-key"
              type="password"
              placeholder="Chave fornecida pelo administrador"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'A guardar…' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
