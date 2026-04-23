import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ContaDto } from '@/lib/types';

interface LiquidarDialogProps {
  dialog: { parcelaId: string; data: string; isRecorrente: boolean; valorReal: string; contaId: string } | null;
  contas: ContaDto[];
  onClose: () => void;
  onDataChange: (data: string) => void;
  onValorRealChange: (valor: string) => void;
  onContaChange: (contaId: string) => void;
  onConfirm: () => void;
  variant: 'receita' | 'despesa';
}

export function LiquidarDialog({
  dialog,
  contas,
  onClose,
  onDataChange,
  onValorRealChange,
  onContaChange,
  onConfirm,
  variant,
}: LiquidarDialogProps) {
  const confirmClass = variant === 'receita'
    ? 'bg-green-600 hover:bg-green-700 text-white'
    : 'bg-red-600 hover:bg-red-700 text-white';

  return (
    <Dialog open={!!dialog} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Liquidar Parcela</DialogTitle>
          <DialogDescription>Confirme os dados do pagamento</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="ld-conta" className="text-xs font-medium text-gray-700">CONTA</Label>
            <Select value={dialog?.contaId ?? ''} onValueChange={onContaChange}>
              <SelectTrigger id="ld-conta" className="mt-1.5">
                <SelectValue placeholder="Selecionar conta" />
              </SelectTrigger>
              <SelectContent>
                {contas.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                    <span className="ml-2 text-xs text-gray-400">
                      €{c.saldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          {variant === 'despesa' && dialog?.isRecorrente && (
            <div>
              <Label htmlFor="ld-valor-real" className="text-xs font-medium text-gray-700">VALOR REAL (€)</Label>
              <input
                id="ld-valor-real"
                type="number"
                min="0"
                step="0.01"
                value={dialog.valorReal}
                onChange={e => onValorRealChange(e.target.value)}
                placeholder="Opcional"
                className="mt-1.5 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              className={confirmClass}
              disabled={!dialog?.data || !dialog?.contaId}
              onClick={onConfirm}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
