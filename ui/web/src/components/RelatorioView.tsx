import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { ReportActionButtons } from '@/components/ReportActionButtons';
import { usePagination } from '@/hooks/usePagination';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/dates';
import { downloadCsv } from '@/lib/csv';
import { CATEGORIA_RECEITA_LABELS, CATEGORIA_LABELS } from '@/lib/types';

// ── tipos ──────────────────────────────────────────────────────────────────────

type Origem = 'Receita' | 'Despesa';

interface ParcelaRelatorio {
  id: string;
  origem: Origem;
  origemNome: string;
  categoria: string | null;
  numero: number;
  dataVencimento: string;
  dataPagamento: string | null;
  valor: number;
  isPaid: boolean;
  contaId: string;
}

interface Filtros {
  origem: 'todas' | Origem;
  categoria: string; // '' = todas
  contaId: string; // '' = todas
  pagamento: 'todas' | 'pago' | 'pendente';
  valorMin: string;
  valorMax: string;
  vencimentoInicio: string;
  vencimentoFim: string;
  pagamentoInicio: string;
  pagamentoFim: string;
}

const FILTROS_VAZIOS: Filtros = {
  origem: 'todas',
  categoria: '',
  contaId: '',
  pagamento: 'todas',
  valorMin: '',
  valorMax: '',
  vencimentoInicio: '',
  vencimentoFim: '',
  pagamentoInicio: '',
  pagamentoFim: '',
};

function contarFiltrosAtivos(f: Filtros): number {
  let n = 0;
  if (f.origem !== 'todas') n++;
  if (f.categoria) n++;
  if (f.contaId) n++;
  if (f.pagamento !== 'todas') n++;
  if (f.valorMin) n++;
  if (f.valorMax) n++;
  if (f.vencimentoInicio) n++;
  if (f.vencimentoFim) n++;
  if (f.pagamentoInicio) n++;
  if (f.pagamentoFim) n++;
  return n;
}

type SortField = 'nome' | 'vencimento' | 'pagamento' | 'valor';
type SortDir = 'asc' | 'desc';

function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 h-7 rounded-full text-xs font-medium border transition-colors ${
        active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function SortIcon({ field, sort }: { field: SortField; sort: { field: SortField | null; dir: SortDir } }) {
  if (sort.field !== field) return <ChevronsUpDown className="inline w-3.5 h-3.5 ml-1 text-slate-400" />;
  return sort.dir === 'asc'
    ? <ArrowUp className="inline w-3.5 h-3.5 ml-1 text-indigo-500" />
    : <ArrowDown className="inline w-3.5 h-3.5 ml-1 text-indigo-500" />;
}

const fmtEur = (v: number) => `€${v.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;

// ── componente ─────────────────────────────────────────────────────────────────

export function RelatorioView() {
  const toast = useToast();
  const { data: receitas } = useAsync(() => api.receitas.listar(), []);
  const { data: despesas } = useAsync(() => api.despesas.listar(), []);
  const { data: contas } = useAsync(() => api.contas.listar(), []);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const filtrosAtivos = useMemo(() => contarFiltrosAtivos(filtros), [filtros]);
  const [sort, setSort] = useState<{ field: SortField | null; dir: SortDir }>({ field: 'vencimento', dir: 'desc' });
  const toggleSort = (field: SortField) =>
    setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });

  const todasParcelas = useMemo((): ParcelaRelatorio[] => {
    const deReceitas = (receitas ?? []).flatMap(r =>
      r.parcelas.map((p): ParcelaRelatorio => ({
        id: p.id,
        origem: 'Receita',
        origemNome: r.nome,
        categoria: r.categoria ? CATEGORIA_RECEITA_LABELS[r.categoria] : null,
        numero: p.numero,
        dataVencimento: p.dataVencimento,
        dataPagamento: p.dataPagamento,
        valor: p.valorLiquido,
        isPaid: p.isPaid,
        contaId: p.contaId,
      })),
    );
    const deDespesas = (despesas ?? []).flatMap(d =>
      d.parcelas.map((p): ParcelaRelatorio => ({
        id: p.id,
        origem: 'Despesa',
        origemNome: d.nome,
        categoria: d.categoria ? CATEGORIA_LABELS[d.categoria] : null,
        numero: p.numero,
        dataVencimento: p.dataVencimento,
        dataPagamento: p.dataPagamento,
        valor: p.valorLiquido,
        isPaid: p.isPaid,
        contaId: p.contaId,
      })),
    );
    return [...deReceitas, ...deDespesas];
  }, [receitas, despesas]);

  const categoriasDisponiveis = useMemo(
    () => [...new Set(todasParcelas.map(p => p.categoria).filter((c): c is string => c !== null))].sort(),
    [todasParcelas],
  );

  const filtered = useMemo(() =>
    todasParcelas
      .filter(p => p.origemNome.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(p => filtros.origem === 'todas' || p.origem === filtros.origem)
      .filter(p => !filtros.categoria || p.categoria === filtros.categoria)
      .filter(p => !filtros.contaId || p.contaId === filtros.contaId)
      .filter(p => filtros.pagamento === 'todas' || (filtros.pagamento === 'pago' ? p.isPaid : !p.isPaid))
      .filter(p => !filtros.valorMin || p.valor >= parseFloat(filtros.valorMin))
      .filter(p => !filtros.valorMax || p.valor <= parseFloat(filtros.valorMax))
      .filter(p => !filtros.vencimentoInicio || p.dataVencimento >= filtros.vencimentoInicio)
      .filter(p => !filtros.vencimentoFim || p.dataVencimento <= filtros.vencimentoFim)
      .filter(p => !filtros.pagamentoInicio || (p.dataPagamento ?? '') >= filtros.pagamentoInicio)
      .filter(p => !filtros.pagamentoFim || (p.dataPagamento ?? '') <= filtros.pagamentoFim),
    [todasParcelas, searchTerm, filtros],
  );

  const sorted = useMemo(() => {
    if (!sort.field) return filtered;
    const mul = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sort.field === 'nome') return a.origemNome.localeCompare(b.origemNome) * mul;
      if (sort.field === 'vencimento') return a.dataVencimento.localeCompare(b.dataVencimento) * mul;
      if (sort.field === 'pagamento') return (a.dataPagamento ?? '').localeCompare(b.dataPagamento ?? '') * mul;
      return (a.valor - b.valor) * mul;
    });
  }, [filtered, sort]);

  const { page, totalPages, pageItems, setPage, reset: resetPage } = usePagination(sorted, 25);
  useEffect(() => { resetPage(); }, [searchTerm, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalValor = useMemo(() => sorted.reduce((s, p) => s + p.valor, 0), [sorted]);

  const contaNome = (id: string) => (contas ?? []).find(c => c.id === id)?.nome ?? '—';

  const relatorioSubtitulo = useMemo(() => {
    const partes: string[] = [];
    if (searchTerm) partes.push(`Pesquisa: "${searchTerm}"`);
    if (filtros.origem !== 'todas') partes.push(`Tipo de parcela: ${filtros.origem}`);
    if (filtros.categoria) partes.push(`Categoria: ${filtros.categoria}`);
    if (filtros.contaId) partes.push(`Conta: ${contaNome(filtros.contaId)}`);
    if (filtros.pagamento !== 'todas') partes.push(`Estado de pagamento: ${filtros.pagamento === 'pago' ? 'Pago' : 'Pendente'}`);
    if (filtros.valorMin && filtros.valorMax) partes.push(`Valor entre: ${fmtEur(parseFloat(filtros.valorMin))} e ${fmtEur(parseFloat(filtros.valorMax))}`);
    else if (filtros.valorMin) partes.push(`Valor mínimo: ${fmtEur(parseFloat(filtros.valorMin))}`);
    else if (filtros.valorMax) partes.push(`Valor máximo: ${fmtEur(parseFloat(filtros.valorMax))}`);
    if (filtros.vencimentoInicio && filtros.vencimentoFim) partes.push(`Vencimento entre: ${formatDate(filtros.vencimentoInicio)} e ${formatDate(filtros.vencimentoFim)}`);
    else if (filtros.vencimentoInicio) partes.push(`Vencimento a partir de: ${formatDate(filtros.vencimentoInicio)}`);
    else if (filtros.vencimentoFim) partes.push(`Vencimento até: ${formatDate(filtros.vencimentoFim)}`);
    if (filtros.pagamentoInicio && filtros.pagamentoFim) partes.push(`Pagamento entre: ${formatDate(filtros.pagamentoInicio)} e ${formatDate(filtros.pagamentoFim)}`);
    else if (filtros.pagamentoInicio) partes.push(`Pagamento a partir de: ${formatDate(filtros.pagamentoInicio)}`);
    else if (filtros.pagamentoFim) partes.push(`Pagamento até: ${formatDate(filtros.pagamentoFim)}`);
    partes.push(`${sorted.length} parcela(s)`);
    return partes.join(' · ');
  }, [searchTerm, filtros, sorted.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportCsv = async () => {
    const headers = ['Origem', 'Nome', 'Categoria', 'Conta', 'Vencimento', 'Pagamento', 'Valor (€)', 'Estado'];
    const rows = sorted.map(p => [
      p.origem,
      p.origemNome,
      p.categoria ?? '—',
      contaNome(p.contaId),
      formatDate(p.dataVencimento),
      p.dataPagamento ? formatDate(p.dataPagamento) : '—',
      p.valor,
      p.isPaid ? 'Pago' : 'Pendente',
    ]);
    rows.push(['Total', '', '', '', '', '', totalValor, '']);
    try {
      await downloadCsv(`relatorio_parcelas_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } catch (e) {
      toast(`Erro ao exportar CSV: ${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-5 pt-3.5 pb-3 border-b border-slate-100 bg-white shrink-0 print:hidden">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base md:text-lg font-semibold text-slate-900">Relatório</h2>
          <ReportActionButtons onExportCsv={handleExportCsv} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
            <Input aria-label="Pesquisar parcelas" placeholder="Pesquisar por nome da receita/despesa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 border-slate-200" />
          </div>
          <Button variant="outline" size="sm" className="h-9 shrink-0 relative" onClick={() => setFiltrosOpen(true)}>
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
            Filtros
            {filtrosAtivos > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold">
                {filtrosAtivos}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white print:hidden">
        <Table>
          <TableHeader className="sticky top-0 bg-slate-50 z-10">
            <TableRow>
              <TableHead className="w-20 text-xs font-semibold text-slate-500 uppercase tracking-wide">Origem</TableHead>
              <TableHead className="cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide" onClick={() => toggleSort('nome')}>
                Nome<SortIcon field="nome" sort={sort} />
              </TableHead>
              <TableHead className="w-32 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Categoria</TableHead>
              <TableHead className="w-28 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Conta</TableHead>
              <TableHead className="w-28 cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide" onClick={() => toggleSort('vencimento')}>
                Vencimento<SortIcon field="vencimento" sort={sort} />
              </TableHead>
              <TableHead className="w-28 cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell" onClick={() => toggleSort('pagamento')}>
                Pagamento<SortIcon field="pagamento" sort={sort} />
              </TableHead>
              <TableHead className="w-28 text-right cursor-pointer select-none text-xs font-semibold text-slate-500 uppercase tracking-wide" onClick={() => toggleSort('valor')}>
                Valor<SortIcon field="valor" sort={sort} />
              </TableHead>
              <TableHead className="w-20 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-gray-500 py-8">
                  {todasParcelas.length === 0 ? 'Nenhuma parcela registada' : 'Nenhum resultado'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {pageItems.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.origem === 'Receita' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {p.origem}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">{p.origemNome}</TableCell>
                    <TableCell className="text-sm text-slate-600 hidden sm:table-cell">{p.categoria ?? '—'}</TableCell>
                    <TableCell className="text-sm text-slate-600 hidden sm:table-cell">{contaNome(p.contaId)}</TableCell>
                    <TableCell className="text-sm text-slate-600 tabular-nums">{formatDate(p.dataVencimento)}</TableCell>
                    <TableCell className="text-sm text-slate-600 tabular-nums hidden sm:table-cell">
                      {p.dataPagamento ? formatDate(p.dataPagamento) : '—'}
                    </TableCell>
                    <TableCell className={`text-right font-semibold tabular-nums ${p.origem === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtEur(p.valor)}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.isPaid ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">Pago</span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">Pend.</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50 font-semibold">
                  <TableCell colSpan={6} className="text-right text-slate-500 hidden sm:table-cell">Total ({sorted.length} parcela(s))</TableCell>
                  <TableCell colSpan={2} className="text-right text-slate-500 sm:hidden">Total</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-900">{fmtEur(totalValor)}</TableCell>
                  <TableCell />
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
        <Pagination page={page} totalPages={totalPages} totalItems={sorted.length} pageSize={25} onPageChange={setPage} />
      </div>

      {/* ── Documento de impressão — construído do zero, não é um snapshot da tabela ── */}
      <div className="hidden print:block print-report px-8 py-6 text-black bg-white">
        <div className="text-center mb-6 pb-4 border-b-2 border-black">
          <h1 className="text-2xl font-bold tracking-wide">RELATÓRIO DE PARCELAS</h1>
          <p className="text-sm mt-1.5">{relatorioSubtitulo}</p>
          <p className="text-xs text-gray-600 mt-1">Gerado em {new Date().toLocaleString('pt-PT')}</p>
        </div>

        {sorted.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhuma parcela corresponde aos filtros aplicados.</p>
        ) : (
          <>
            {(['Receita', 'Despesa'] as Origem[]).map(origem => {
              const grupo = sorted.filter(p => p.origem === origem);
              if (grupo.length === 0) return null;
              const subtotal = grupo.reduce((s, p) => s + p.valor, 0);
              const pagas = grupo.filter(p => p.isPaid).length;
              return (
                <div key={origem} className="mb-8" style={{ breakInside: 'avoid' }}>
                  <h2 className="text-sm font-bold uppercase border-b border-black pb-1 mb-2">
                    {origem === 'Receita' ? 'Receitas' : 'Despesas'} — {grupo.length} parcela(s), {pagas} paga(s)
                  </h2>
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-gray-400 px-1.5 py-1 text-left">Nº</th>
                        <th className="border border-gray-400 px-1.5 py-1 text-left">Nome</th>
                        <th className="border border-gray-400 px-1.5 py-1 text-left">Categoria</th>
                        <th className="border border-gray-400 px-1.5 py-1 text-left">Conta</th>
                        <th className="border border-gray-400 px-1.5 py-1 text-left">Vencimento</th>
                        <th className="border border-gray-400 px-1.5 py-1 text-left">Pagamento</th>
                        <th className="border border-gray-400 px-1.5 py-1 text-right">Valor</th>
                        <th className="border border-gray-400 px-1.5 py-1 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.map(p => (
                        <tr key={p.id} style={{ breakInside: 'avoid' }}>
                          <td className="border border-gray-400 px-1.5 py-1">{p.numero}</td>
                          <td className="border border-gray-400 px-1.5 py-1">{p.origemNome}</td>
                          <td className="border border-gray-400 px-1.5 py-1">{p.categoria ?? '—'}</td>
                          <td className="border border-gray-400 px-1.5 py-1">{contaNome(p.contaId)}</td>
                          <td className="border border-gray-400 px-1.5 py-1">{formatDate(p.dataVencimento)}</td>
                          <td className="border border-gray-400 px-1.5 py-1">{p.dataPagamento ? formatDate(p.dataPagamento) : '—'}</td>
                          <td className="border border-gray-400 px-1.5 py-1 text-right">{fmtEur(p.valor)}</td>
                          <td className="border border-gray-400 px-1.5 py-1 text-center">{p.isPaid ? 'Pago' : 'Pendente'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold">
                        <td colSpan={6} className="border border-gray-400 px-1.5 py-1 text-right">
                          Subtotal {origem === 'Receita' ? 'Receitas' : 'Despesas'}
                        </td>
                        <td className="border border-gray-400 px-1.5 py-1 text-right">{fmtEur(subtotal)}</td>
                        <td className="border border-gray-400" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}

            <div className="flex justify-between items-baseline pt-3 border-t-2 border-black font-bold text-sm">
              <span>TOTAL GERAL — {sorted.length} parcela(s)</span>
              <span>{fmtEur(totalValor)}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Filtros ── */}
      <Dialog open={filtrosOpen} onOpenChange={setFiltrosOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Origem</Label>
              <div className="flex gap-1.5 mt-1.5">
                <PillButton active={filtros.origem === 'todas'} onClick={() => setFiltros(f => ({ ...f, origem: 'todas' }))}>Todas</PillButton>
                <PillButton active={filtros.origem === 'Receita'} onClick={() => setFiltros(f => ({ ...f, origem: 'Receita' }))}>Receita</PillButton>
                <PillButton active={filtros.origem === 'Despesa'} onClick={() => setFiltros(f => ({ ...f, origem: 'Despesa' }))}>Despesa</PillButton>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoria</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <PillButton active={filtros.categoria === ''} onClick={() => setFiltros(f => ({ ...f, categoria: '' }))}>Todas</PillButton>
                {categoriasDisponiveis.map(cat => (
                  <PillButton key={cat} active={filtros.categoria === cat} onClick={() => setFiltros(f => ({ ...f, categoria: cat }))}>
                    {cat}
                  </PillButton>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="rel-conta" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Conta</Label>
              <Select value={filtros.contaId || '_todas'} onValueChange={v => setFiltros(f => ({ ...f, contaId: v === '_todas' ? '' : v }))}>
                <SelectTrigger id="rel-conta" className="mt-1.5"><SelectValue placeholder="Todas as contas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_todas">Todas as contas</SelectItem>
                  {(contas ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado de pagamento</Label>
              <div className="flex gap-1.5 mt-1.5">
                <PillButton active={filtros.pagamento === 'todas'} onClick={() => setFiltros(f => ({ ...f, pagamento: 'todas' }))}>Todas</PillButton>
                <PillButton active={filtros.pagamento === 'pago'} onClick={() => setFiltros(f => ({ ...f, pagamento: 'pago' }))}>Pago</PillButton>
                <PillButton active={filtros.pagamento === 'pendente'} onClick={() => setFiltros(f => ({ ...f, pagamento: 'pendente' }))}>Pendente</PillButton>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rel-valor-min" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor mín. (€)</Label>
                <Input id="rel-valor-min" type="number" min="0" step="0.01" placeholder="0.00"
                  value={filtros.valorMin} onChange={e => setFiltros(f => ({ ...f, valorMin: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="rel-valor-max" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor máx. (€)</Label>
                <Input id="rel-valor-max" type="number" min="0" step="0.01" placeholder="0.00"
                  value={filtros.valorMax} onChange={e => setFiltros(f => ({ ...f, valorMax: e.target.value }))} className="mt-1.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rel-venc-inicio" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vencimento desde</Label>
                <input id="rel-venc-inicio" type="date" value={filtros.vencimentoInicio}
                  onChange={e => setFiltros(f => ({ ...f, vencimentoInicio: e.target.value }))}
                  className="mt-1.5 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" />
              </div>
              <div>
                <Label htmlFor="rel-venc-fim" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vencimento até</Label>
                <input id="rel-venc-fim" type="date" value={filtros.vencimentoFim}
                  onChange={e => setFiltros(f => ({ ...f, vencimentoFim: e.target.value }))}
                  className="mt-1.5 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rel-pag-inicio" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pagamento desde</Label>
                <input id="rel-pag-inicio" type="date" value={filtros.pagamentoInicio}
                  onChange={e => setFiltros(f => ({ ...f, pagamentoInicio: e.target.value }))}
                  className="mt-1.5 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" />
              </div>
              <div>
                <Label htmlFor="rel-pag-fim" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pagamento até</Label>
                <input id="rel-pag-fim" type="date" value={filtros.pagamentoFim}
                  onChange={e => setFiltros(f => ({ ...f, pagamentoFim: e.target.value }))}
                  className="mt-1.5 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setFiltros(FILTROS_VAZIOS)} disabled={filtrosAtivos === 0}>
              Limpar filtros
            </Button>
            <Button size="sm" onClick={() => setFiltrosOpen(false)}>Aplicar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
