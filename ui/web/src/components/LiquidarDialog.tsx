import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface LiquidarDialogProps {
  dialog: { parcelaId: string; data: string } | null;
  onClose: () => void;
  onDataChange: (data: string) => void;
  onConfirm: () => void;
  variant: 'receita' | 'despesa';
}

export function LiquidarDialog({ dialog, onClose, onDataChange, onConfirm, variant }: LiquidarDialogProps) {
  const confirmClass = variant === 'receita'
    ? 'bg-green-600 hover:bg-green-700 text-white'
    : 'bg-red-600 hover:bg-red-700 text-white';

  return (
    <Dialog open={!!dialog} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Liquidar Parcela</DialogTitle>
          <DialogDescription>Confirme a data de pagamento</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="ld-data" className="text-xs font-medium text-gray-700">DATA DE PAGAMENTO</Label>
            <input
              id="ld-data"
              type="date"
              value={dialog?.data ?? ''}
              onChange={e => onDataChange(e.target.value)}
              className="mt-1.5 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button className={confirmClass} disabled={!dialog?.data} onClick={onConfirm}>
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
