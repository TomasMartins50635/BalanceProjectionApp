import { Calendar, CheckCircle2, Trash2, ArrowUp, ArrowDown, ChevronsUpDown, ArrowLeftRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/dates';
import type { ParcelaDto } from '@/lib/types';

type SortField = 'data' | 'valor';
type SortDir = 'asc' | 'desc';

interface ParcelasTableProps {
  parcelas: ParcelaDto[];
  variant: 'receita' | 'despesa';
  despesaTipo?: 'Pontual' | 'Fixa' | 'Recorrente';
  parcelaSort: { field: SortField; dir: SortDir };
  toggleSort: (field: SortField) => void;
  liquidando: string | null;
  estornando: string | null;
  onLiquidar: (id: string, isRecorrente?: boolean, contaId?: string) => void;
  onEstornar: (id: string) => void;
  onAlterarConta?: (parcelaId: string, currentContaId: string) => void;
  removendoParcela?: string | null;
  onRemoverParcela?: (id: string) => void;
}

function SortIcon({ field, sort }: { field: SortField; sort: { field: SortField; dir: SortDir } }) {
  if (sort.field !== field) return <ChevronsUpDown className="inline w-3.5 h-3.5 ml-1 text-slate-400" />;
  return sort.dir === 'asc'
    ? <ArrowUp className="inline w-3.5 h-3.5 ml-1 text-indigo-500" />
    : <ArrowDown className="inline w-3.5 h-3.5 ml-1 text-indigo-500" />;
}

export function ParcelasTable({
  parcelas, variant, despesaTipo, parcelaSort, toggleSort,
  liquidando, estornando, onLiquidar, onEstornar, onAlterarConta,
  removendoParcela, onRemoverParcela,
}: ParcelasTableProps) {
  const isReceita = variant === 'receita';

  const sorted = [...parcelas].sort((a, b) => {
    const mul = parcelaSort.dir === 'asc' ? 1 : -1;
    if (parcelaSort.field === 'data') return a.dataVencimento.localeCompare(b.dataVencimento) * mul;
    return (a.valorLiquido - b.valorLiquido) * mul;
  });

  return (
    <>
      {/* ── Mobile: card list ─────────────────────────────────────────────── */}
      <div className="sm:hidden divide-y divide-slate-100">
        {sorted.map(p => (
          <div key={p.id} className="p-3 space-y-2">
            {/* Top row: numero + data + estado */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-slate-400 tabular-nums font-medium">#{p.numero}</span>
                <div className="flex items-center gap-1 text-xs text-slate-600 tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                  {formatDate(p.dataVencimento)}
                </div>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${p.isPaid ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                {p.isPaid ? 'Liquidada' : 'Pendente'}
              </span>
            </div>

            {/* Middle row: valor */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-400 space-y-0.5">
                {isReceita && p.percentagem != null && (
                  <span>{p.percentagem}% · Bruto €{p.valorBruto.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                )}
                {p.isPaid && p.dataPagamento && (
                  <div>Pago em {formatDate(p.dataPagamento)}</div>
                )}
              </div>
              <span className={`text-base font-bold tabular-nums ${isReceita ? 'text-green-600' : 'text-red-600'}`}>
                €{p.valorLiquido.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Actions */}
            {!p.isPaid && (
              <div className="flex gap-1.5 pt-0.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs rounded-lg text-indigo-700 border-indigo-200 hover:bg-indigo-50 flex-1"
                  disabled={liquidando === p.id}
                  onClick={() => onLiquidar(p.id, !isReceita && despesaTipo === 'Recorrente', p.contaId)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {liquidando === p.id ? '...' : 'Liquidar'}
                </Button>
                {onAlterarConta && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                    onClick={() => onAlterarConta(p.id, p.contaId)}
                    aria-label="Alterar conta"
                    title="Alterar conta"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </Button>
                )}
                {!isReceita && onRemoverParcela && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    disabled={removendoParcela === p.id}
                    onClick={() => onRemoverParcela(p.id)}
                    aria-label="Eliminar parcela"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )}
            {p.isPaid && (
              <div className="flex justify-end pt-0.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                  disabled={estornando === p.id}
                  onClick={() => onEstornar(p.id)}
                >
                  {estornando === p.id ? '...' : 'Estornar'}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Desktop: table ────────────────────────────────────────────────── */}
      <Table className="hidden sm:table">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</TableHead>
            <TableHead className="w-36 cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide" onClick={() => toggleSort('data')}>
              Vencimento<SortIcon field="data" sort={parcelaSort} />
            </TableHead>
            {isReceita && <TableHead className="w-20 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">%</TableHead>}
            {isReceita && <TableHead className="w-36 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Bruto</TableHead>}
            <TableHead className="w-36 text-right cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide" onClick={() => toggleSort('valor')}>
              {isReceita ? 'Líquido' : 'Valor'}<SortIcon field="valor" sort={parcelaSort} />
            </TableHead>
            <TableHead className="w-24 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(p => (
            <TableRow key={p.id} className={!p.isPaid ? 'opacity-80' : ''}>
              <TableCell className="text-slate-400 text-sm tabular-nums">{p.numero}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-300" aria-hidden="true" />
                  <span className="text-sm text-slate-700 tabular-nums">{formatDate(p.dataVencimento)}</span>
                </div>
              </TableCell>
              {isReceita && (
                <TableCell className="text-right text-sm text-slate-500 tabular-nums">
                  {p.percentagem != null ? `${p.percentagem}%` : '—'}
                </TableCell>
              )}
              {isReceita && (
                <TableCell className="text-right text-sm text-slate-500 tabular-nums">
                  €{p.valorBruto.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                </TableCell>
              )}
              <TableCell className={`text-right font-semibold tabular-nums ${isReceita ? 'text-green-600' : 'text-red-600'}`}>
                €{p.valorLiquido.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.isPaid ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                  {p.isPaid ? 'Liquidada' : 'Pendente'}
                </span>
              </TableCell>
              <TableCell>
                {!p.isPaid && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs rounded-lg text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      disabled={liquidando === p.id}
                      onClick={() => onLiquidar(p.id, !isReceita && despesaTipo === 'Recorrente', p.contaId)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      {liquidando === p.id ? '...' : 'Liquidar'}
                    </Button>
                    {onAlterarConta && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => onAlterarConta(p.id, p.contaId)}
                        aria-label="Alterar conta"
                        title="Alterar conta"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {!isReceita && onRemoverParcela && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        disabled={removendoParcela === p.id}
                        onClick={() => onRemoverParcela(p.id)}
                        aria-label="Eliminar parcela"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
                {p.isPaid && (
                  <div className="flex items-center gap-2">
                    {p.dataPagamento && <span className="text-xs text-slate-400 tabular-nums">{formatDate(p.dataPagamento)}</span>}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                      disabled={estornando === p.id}
                      onClick={() => onEstornar(p.id)}
                    >
                      {estornando === p.id ? '...' : 'Estornar'}
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
