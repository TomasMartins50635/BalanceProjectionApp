import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ConsistenciaDto } from '@/lib/types';

const fmt = (v: number) =>
  `€${v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtMes = (s: string) =>
  new Date(s + 'T00:00:00').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

interface Props {
  dados: ConsistenciaDto;
  isCorrigindo: boolean;
  onCorrigir: () => void;
  onIgnorar: () => void;
}

export function ConsistenciaDialog({ dados, isCorrigindo, onCorrigir, onIgnorar }: Props) {
  const totalItens = dados.inconsistenciasIva.length + dados.inconsistenciasComissao.length
    + dados.inconsistenciasParcelaReceita.length;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-lg" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Inconsistências encontradas</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2 max-h-80 overflow-auto">
          <p className="text-sm text-slate-500">
            A atualização foi instalada. Antes de reiniciar, foram encontradas {totalItens} inconsistência(s)
            entre dados calculados automaticamente (IVA e comissões) e o que está guardado.
          </p>

          {dados.inconsistenciasIva.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Despesas de IVA
              </p>
              <div className="flex flex-col gap-1">
                {dados.inconsistenciasIva.map(i => (
                  <div key={i.receitaId} className="flex items-center justify-between text-sm bg-slate-50 rounded px-2.5 py-1.5">
                    <span className="text-slate-700 truncate">{i.receitaNome}</span>
                    <span className="text-xs text-slate-500 tabular-nums shrink-0 ml-2">
                      {i.despesaEmFalta ? 'em falta' : `${fmt(i.valorAtual)} → ${fmt(i.valorEsperado)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dados.inconsistenciasComissao.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Comissões de colaboradores
              </p>
              <div className="flex flex-col gap-1">
                {dados.inconsistenciasComissao.map(c => (
                  <div key={`${c.colaboradorId}-${c.mes}`} className="flex items-center justify-between text-sm bg-slate-50 rounded px-2.5 py-1.5">
                    <span className="text-slate-700 truncate">{c.colaboradorNome} — {fmtMes(c.mes)}</span>
                    <span className="text-xs text-slate-500 tabular-nums shrink-0 ml-2">
                      {c.despesaEmFalta ? 'em falta' : `${fmt(c.valorAtual)} → ${fmt(c.valorEsperado)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dados.inconsistenciasParcelaReceita.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Parcelas com valor bruto/líquido inconsistente
              </p>
              <p className="text-xs text-amber-600 mb-1.5">
                Não corrigível automaticamente — requer decisão manual.
              </p>
              <div className="flex flex-col gap-1">
                {dados.inconsistenciasParcelaReceita.map(p => (
                  <div key={p.parcelaId} className="flex items-center justify-between text-sm bg-slate-50 rounded px-2.5 py-1.5">
                    <span className="text-slate-700 truncate">
                      {p.receitaNome} — parcela {p.numero} {p.isPaid ? '(paga)' : '(pendente)'}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums shrink-0 ml-2">
                      {fmt(p.valorBrutoAtual)} → {fmt(p.valorBrutoEsperado)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onIgnorar} disabled={isCorrigindo}>
            Ignorar e reiniciar
          </Button>
          <Button onClick={onCorrigir} disabled={isCorrigindo}>
            {isCorrigindo ? 'A corrigir…' : 'Corrigir tudo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
