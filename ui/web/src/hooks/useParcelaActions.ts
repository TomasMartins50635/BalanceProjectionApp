import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from './useToast';

type SortField = 'data' | 'valor';
type SortDir = 'asc' | 'desc';

export function useParcelaActions(reload: () => void) {
  const toast = useToast();

  const [liquidando, setLiquidando] = useState<string | null>(null);
  const [liquidarDialog, setLiquidarDialog] = useState<{ parcelaId: string; data: string } | null>(null);
  const [estornando, setEstornando] = useState<string | null>(null);
  const [parcelaSort, setParcelaSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'data', dir: 'asc' });

  const openLiquidarDialog = (parcelaId: string) =>
    setLiquidarDialog({ parcelaId, data: new Date().toISOString().slice(0, 10) });

  const toggleSort = (field: SortField) =>
    setParcelaSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });

  const handleLiquidar = async () => {
    if (!liquidarDialog) return;
    setLiquidando(liquidarDialog.parcelaId);
    setLiquidarDialog(null);
    try {
      await api.parcelas.liquidar(liquidarDialog.parcelaId, liquidarDialog.data);
      toast('Parcela liquidada com sucesso');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLiquidando(null);
    }
  };

  const handleEstornar = async (parcelaId: string) => {
    setEstornando(parcelaId);
    try {
      await api.parcelas.estornar(parcelaId);
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
    openLiquidarDialog,
    parcelaSort,
    toggleSort,
    handleLiquidar,
    handleEstornar,
  };
}
