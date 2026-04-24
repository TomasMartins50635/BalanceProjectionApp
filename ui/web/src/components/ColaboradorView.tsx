import { useState } from 'react';
import { Plus, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';

export function ColaboradorView() {
  const toast = useToast();
  const { data: colaboradores, loading, error, reload } = useAsync(() => api.colaboradores.listar(), []);

  const [createOpen, setCreateOpen] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formPercentagem, setFormPercentagem] = useState('');
  const [saving, setSaving] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);

  const handleCriar = async () => {
    if (!formNome.trim() || formPercentagem === '') {
      toast('Preencha todos os campos', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.colaboradores.criar({ nome: formNome.trim(), percentagem: parseFloat(formPercentagem) });
      toast('Colaborador criado com sucesso');
      setCreateOpen(false);
      setFormNome('');
      setFormPercentagem('');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id: string) => {
    try {
      await api.colaboradores.eliminar(id);
      toast('Colaborador removido');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setEliminando(null);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-full">
      <div className="mb-4 md:mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Colaboradores</h2>
          <p className="text-sm text-slate-500">Gestão de colaboradores e respetivas comissões</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> Novo Colaborador
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {error ? (
          <div className="p-6 text-center text-red-600 text-sm">{error}</div>
        ) : loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />)}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</TableHead>
                <TableHead className="w-40 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Comissão (%)</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(colaboradores ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-slate-500 py-12">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Nenhum colaborador registado
                  </TableCell>
                </TableRow>
              ) : (
                (colaboradores ?? []).map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-slate-800">{c.nome}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 tabular-nums">
                        {c.percentagem}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setEliminando(c.id)}
                        aria-label={`Remover ${c.nome}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) { setFormNome(''); setFormPercentagem(''); } }}>
        <DialogContent className="sm:max-w-md shadow-xl">
          <DialogHeader>
            <DialogTitle>Novo Colaborador</DialogTitle>
            <DialogDescription>Defina o nome e a percentagem de comissão do colaborador.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="col-nome" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome *</Label>
              <Input
                id="col-nome"
                placeholder="Ex: João Silva"
                value={formNome}
                onChange={e => setFormNome(e.target.value)}
                className="mt-1.5 border-slate-200 focus-visible:ring-indigo-400"
              />
            </div>
            <div>
              <Label htmlFor="col-perc" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Comissão (%) *</Label>
              <div className="relative mt-1.5">
                <Input
                  id="col-perc"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                  value={formPercentagem}
                  onChange={e => setFormPercentagem(e.target.value)}
                  className="pr-8 border-slate-200 focus-visible:ring-indigo-400 tabular-nums"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-lg" onClick={() => setCreateOpen(false)} disabled={saving}>Cancelar</Button>
              <Button className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCriar} disabled={saving || !formNome.trim() || formPercentagem === ''}>
                {saving ? 'A guardar…' : 'Criar Colaborador'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={eliminando !== null}
        onOpenChange={open => { if (!open) setEliminando(null); }}
        title="Remover colaborador"
        description="O colaborador ficará marcado como removido e deixará de aparecer nas listas. As receitas existentes associadas a este colaborador não são afetadas."
        confirmLabel="Remover"
        onConfirm={() => eliminando && handleEliminar(eliminando)}
      />
    </div>
  );
}
