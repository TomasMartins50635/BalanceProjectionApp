import { useState } from 'react';
import { Plus, Users, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import type { TipoColaborador } from '@/lib/types';
import { TIPO_COLABORADOR_LABELS } from '@/lib/types';
import { ColaboradorAnaliseView } from './ColaboradorAnaliseView';

interface ColaboradorForm {
  nome: string;
  tipo: TipoColaborador;
  percentagemVenda: string;
  percentagemAngariacao: string;
  percentagemServico: string;
}

const emptyForm = (): ColaboradorForm => ({
  nome: '',
  tipo: 'Comercial',
  percentagemVenda: '',
  percentagemAngariacao: '',
  percentagemServico: '',
});

export function ColaboradorView() {
  const toast = useToast();
  const { data: colaboradores, loading, error, reload } = useAsync(() => api.colaboradores.listar(), []);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<ColaboradorForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [analiseId, setAnaliseId] = useState<string | null>(null);

  if (analiseId) {
    return <ColaboradorAnaliseView colaboradorId={analiseId} onBack={() => setAnaliseId(null)} />;
  }

  const handleCriar = async () => {
    if (!form.nome.trim()) { toast('Nome obrigatório', 'error'); return; }
    if (form.tipo === 'Comercial') {
      if (form.percentagemVenda === '' || form.percentagemAngariacao === '') {
        toast('Preencha as comissões de venda e angariação', 'error'); return;
      }
    } else {
      if (form.percentagemServico === '') { toast('Preencha a comissão de serviço', 'error'); return; }
    }

    setSaving(true);
    try {
      await api.colaboradores.criar({
        nome: form.nome.trim(),
        tipo: form.tipo,
        ...(form.tipo === 'Comercial'
          ? { percentagemVenda: parseFloat(form.percentagemVenda), percentagemAngariacao: parseFloat(form.percentagemAngariacao) }
          : { percentagemServico: parseFloat(form.percentagemServico) }),
      });
      toast('Colaborador criado com sucesso');
      setCreateOpen(false);
      setForm(emptyForm());
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

  const percentInput = (label: string, value: string, onChange: (v: string) => void) => (
    <div>
      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label} (%)</Label>
      <div className="relative mt-1.5">
        <Input
          type="number" min="0" max="100" step="0.1" placeholder="0"
          value={value} onChange={e => onChange(e.target.value)}
          className="pr-8 border-slate-200 focus-visible:ring-indigo-400 tabular-nums"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
      </div>
    </div>
  );

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
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Comissões</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(colaboradores ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-slate-500 py-12">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Nenhum colaborador registado
                  </TableCell>
                </TableRow>
              ) : (
                (colaboradores ?? []).map(c => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-indigo-50/40 transition-colors"
                    onClick={() => setAnaliseId(c.id)}
                  >
                    <TableCell className="font-medium text-slate-800">
                      <div className="flex items-center gap-1">
                        {c.nome}
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        c.tipo === 'Comercial' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {TIPO_COLABORADOR_LABELS[c.tipo]}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1.5">
                        {c.tipo === 'Comercial' ? (
                          <>
                            {c.percentagemVenda != null && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 tabular-nums">
                                Venda {c.percentagemVenda}%
                              </span>
                            )}
                            {c.percentagemAngariacao != null && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 tabular-nums">
                                Angariação {c.percentagemAngariacao}%
                              </span>
                            )}
                          </>
                        ) : (
                          c.percentagemServico != null && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 tabular-nums">
                              Serviço {c.percentagemServico}%
                            </span>
                          )
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={e => { e.stopPropagation(); setEliminando(c.id); }}
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

      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) setForm(emptyForm()); }}>
        <DialogContent className="sm:max-w-md shadow-xl">
          <DialogHeader>
            <DialogTitle>Novo Colaborador</DialogTitle>
            <DialogDescription>Defina o tipo e as comissões base do colaborador.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="col-nome" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome *</Label>
              <Input
                id="col-nome" placeholder="Ex: João Silva"
                value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                className="mt-1.5 border-slate-200 focus-visible:ring-indigo-400"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo *</Label>
              <div className="flex gap-2 mt-1.5">
                {(['Comercial', 'Servico'] as TipoColaborador[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.tipo === t
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {TIPO_COLABORADOR_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {form.tipo === 'Comercial' ? (
              <div className="grid grid-cols-2 gap-3">
                {percentInput('Comissão de Venda', form.percentagemVenda, v => setForm(f => ({ ...f, percentagemVenda: v })))}
                {percentInput('Comissão de Angariação', form.percentagemAngariacao, v => setForm(f => ({ ...f, percentagemAngariacao: v })))}
              </div>
            ) : (
              percentInput('Comissão de Serviço', form.percentagemServico, v => setForm(f => ({ ...f, percentagemServico: v })))
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-lg" onClick={() => setCreateOpen(false)} disabled={saving}>Cancelar</Button>
              <Button className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCriar} disabled={saving}>
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
        description="O colaborador ficará marcado como removido. As receitas existentes associadas não são afetadas."
        confirmLabel="Remover"
        onConfirm={() => eliminando && handleEliminar(eliminando)}
      />
    </div>
  );
}
