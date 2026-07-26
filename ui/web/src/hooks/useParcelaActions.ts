import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from './useToast';

type SortField = 'data' | 'valor';
type SortDir = 'asc' | 'desc';

type LiquidarDialogState = {
  parcelaId: string;
  data: string;
  isRecorrente: boolean;
  valorReal: string;
  contaId: string;
};

export function useParcelaActions(reload: () => void) {
  const toast = useToast();

  const [liquidando, setLiquidando] = useState<string | null>(null);
  const [liquidarDialog, setLiquidarDialog] = useState<LiquidarDialogState | null>(null);
  const [estornando, setEstornando] = useState<string | null>(null);
  const [estornarConfirmId, setEstornarConfirmId] = useState<string | null>(null);
  const [parcelaSort, setParcelaSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'data', dir: 'asc' });

  const openLiquidarDialog = (parcelaId: string, isRecorrente = false, contaId = '') =>
    setLiquidarDialog({
      parcelaId,
      data: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })(),
      isRecorrente,
      valorReal: '',
      contaId,
    });

  const toggleSort = (field: SortField) =>
    setParcelaSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });

  const handleLiquidar = async () => {
    if (!liquidarDialog) return;
    setLiquidando(liquidarDialog.parcelaId);
    setLiquidarDialog(null);
    try {
      const valorReal = liquidarDialog.isRecorrente && liquidarDialog.valorReal.trim() !== ''
        ? Number(liquidarDialog.valorReal)
        : undefined;

      await api.parcelas.liquidar(
        liquidarDialog.parcelaId,
        liquidarDialog.data,
        valorReal,
        liquidarDialog.contaId || undefined,
      );
      toast('Parcela liquidada com sucesso');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLiquidando(null);
    }
  };

  const handleEstornar = async () => {
    if (!estornarConfirmId) return;
    const id = estornarConfirmId;
    setEstornarConfirmId(null);
    setEstornando(id);
    try {
      await api.parcelas.estornar(id);
      toast('Liquidação revertida');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setEstornando(null);
    }
  };

  return {
    liquidando,
    liquidarDialog,
    setLiquidarDialog,
    estornando,
    estornarConfirmId,
    setEstornarConfirmId,
    openLiquidarDialog,
    parcelaSort,
    toggleSort,
    handleLiquidar,
    handleEstornar,
  };
}
