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
  // despesa only
  removendoParcela?: string | null;
  onRemoverParcela?: (id: string) => void;
}

function SortIcon({ field, sort }: { field: SortField; sort: { field: SortField; dir: SortDir } }) {
  if (sort.field !== field) return <ChevronsUpDown className="inline w-3.5 h-3.5 ml-1 text-gray-400" />;
  return sort.dir === 'asc'
    ? <ArrowUp className="inline w-3.5 h-3.5 ml-1 text-blue-500" />
    : <ArrowDown className="inline w-3.5 h-3.5 ml-1 text-blue-500" />;
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead className="w-36 cursor-pointer select-none" onClick={() => toggleSort('data')}>
            Vencimento<SortIcon field="data" sort={parcelaSort} />
          </TableHead>
          {isReceita && <TableHead className="w-20 text-right">%</TableHead>}
          {isReceita && <TableHead className="w-36 text-right">Bruto</TableHead>}
          <TableHead className="w-36 text-right cursor-pointer select-none" onClick={() => toggleSort('valor')}>
            {isReceita ? 'Líquido' : 'Valor'}<SortIcon field="valor" sort={parcelaSort} />
          </TableHead>
          <TableHead className="w-24">Status</TableHead>
          <TableHead className="w-28" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map(p => (
          <TableRow key={p.id} className={!p.isPaid ? 'opacity-75' : ''}>
            <TableCell className="text-gray-500 text-sm">{p.numero}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" aria-hidden="true" />
                <span className="text-sm">{formatDate(p.dataVencimento)}</span>
              </div>
            </TableCell>
            {isReceita && (
              <TableCell className="text-right text-sm text-gray-500">
                {p.percentagem != null ? `${p.percentagem}%` : '—'}
              </TableCell>
            )}
            {isReceita && (
              <TableCell className="text-right text-sm text-gray-600">
                €{p.valorBruto.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
              </TableCell>
            )}
            <TableCell className={`text-right font-semibold ${isReceita ? 'text-green-600' : 'text-red-600'}`}>
              €{p.valorLiquido.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </TableCell>
            <TableCell>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${p.isPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {p.isPaid ? 'Liquidada' : 'Pendente'}
              </span>
            </TableCell>
            <TableCell>
              {!p.isPaid && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 text-xs ${isReceita ? 'text-green-700 border-green-300 hover:bg-green-50' : 'text-red-700 border-red-300 hover:bg-red-50'}`}
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
                      className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
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
                      className="h-7 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50"
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
                  {p.dataPagamento && <span className="text-xs text-gray-400">{formatDate(p.dataPagamento)}</span>}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-gray-500 hover:text-amber-600 hover:bg-amber-50"
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
  );
}
