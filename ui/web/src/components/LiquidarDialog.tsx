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
  dialog, contas, onClose, onDataChange, onValorRealChange, onContaChange, onConfirm, variant,
}: LiquidarDialogProps) {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const isFutureDate = !!dialog?.data && dialog.data > today;

  const confirmClass = variant === 'receita'
    ? 'bg-green-600 hover:bg-green-700 text-white'
    : 'bg-indigo-600 hover:bg-indigo-700 text-white';

  return (
    <Dialog open={!!dialog} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Liquidar Parcela</DialogTitle>
          <DialogDescription>Confirme os dados do pagamento</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="ld-conta" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Conta</Label>
            <Select value={dialog?.contaId ?? ''} onValueChange={onContaChange}>
              <SelectTrigger id="ld-conta" className="mt-1.5 border-slate-200">
                <SelectValue placeholder="Selecionar conta" />
              </SelectTrigger>
              <SelectContent>
                {contas.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                    <span className="ml-2 text-xs text-slate-400 tabular-nums">
                      €{c.saldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ld-data" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data de Pagamento</Label>
            <input
              id="ld-data"
              type="date"
              value={dialog?.data ?? ''}
              max={today}
              onChange={e => onDataChange(e.target.value)}
              className={`mt-1.5 flex h-9 w-full rounded-lg border bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${isFutureDate ? 'border-red-300 text-red-600' : 'border-slate-200'}`}
            />
            {isFutureDate && (
              <p className="mt-1 text-xs text-red-500">A data não pode ser futura</p>
            )}
          </div>
          {variant === 'despesa' && dialog?.isRecorrente && (
            <div>
              <Label htmlFor="ld-valor-real" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor Real (€)</Label>
              <input
                id="ld-valor-real"
                type="number"
                min="0"
                step="0.01"
                value={dialog.valorReal}
                onChange={e => onValorRealChange(e.target.value)}
                placeholder="Opcional"
                className="mt-1.5 flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" className="rounded-lg" onClick={onClose}>Cancelar</Button>
            <Button
              className={`rounded-lg ${confirmClass}`}
              disabled={!dialog?.data || !dialog?.contaId || isFutureDate}
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
