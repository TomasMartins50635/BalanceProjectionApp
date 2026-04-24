import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';

export function OverviewView() {
  const { data: contas, loading: contasLoading, error: contasError } = useAsync(() => api.contas.listar(), []);
  const { data: receitas } = useAsync(() => api.receitas.listar(), []);
  const { data: despesas } = useAsync(() => api.despesas.listar(), []);

  const totalSaldo = useMemo(
    () => (contas ?? []).reduce((s, c) => s + c.saldo, 0),
    [contas],
  );

  const allPaidReceitasParcelas = useMemo(
    () => (receitas ?? []).flatMap(r => r.parcelas.filter(p => p.isPaid)),
    [receitas],
  );

  const allPaidDespesasParcelas = useMemo(
    () => (despesas ?? []).flatMap(d => d.parcelas.filter(p => p.isPaid)),
    [despesas],
  );

  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const monthPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('pt-PT', { month: 'short', year: 'numeric' });
      const receitasMes = allPaidReceitasParcelas
        .filter(p => p.dataPagamento?.startsWith(monthPrefix))
        .reduce((s, p) => s + p.valorLiquido, 0);
      const despesasMes = allPaidDespesasParcelas
        .filter(p => p.dataPagamento?.startsWith(monthPrefix))
        .reduce((s, p) => s + p.valorLiquido, 0);
      return { month: label, receitas: receitasMes, despesas: despesasMes };
    });
  }, [allPaidReceitasParcelas, allPaidDespesasParcelas]);

  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthReceitas = allPaidReceitasParcelas
    .filter(p => p.dataPagamento?.startsWith(currentMonthPrefix))
    .reduce((s, p) => s + p.valorLiquido, 0);
  const currentMonthDespesas = allPaidDespesasParcelas
    .filter(p => p.dataPagamento?.startsWith(currentMonthPrefix))
    .reduce((s, p) => s + p.valorLiquido, 0);
  const currentMonthNet = currentMonthReceitas - currentMonthDespesas;

  const receitaMap = useMemo(
    () => Object.fromEntries((receitas ?? []).map(r => [r.id, r.nome])),
    [receitas],
  );
  const despesaMap = useMemo(
    () => Object.fromEntries((despesas ?? []).map(d => [d.id, d.nome])),
    [despesas],
  );

  const recentActivity = useMemo(() => {
    const items = [
      ...allPaidReceitasParcelas.map(p => ({
        id: p.id,
        type: 'receita' as const,
        descricao: p.receitaId ? (receitaMap[p.receitaId] ?? 'Receita') : 'Receita',
        valor: p.valorLiquido,
        data: p.dataPagamento ?? p.dataVencimento,
      })),
      ...allPaidDespesasParcelas.map(p => ({
        id: p.id,
        type: 'despesa' as const,
        descricao: p.despesaId ? (despesaMap[p.despesaId] ?? 'Despesa') : 'Despesa',
        valor: p.valorLiquido,
        data: p.dataPagamento ?? p.dataVencimento,
      })),
    ];
    return items.sort((a, b) => b.data.localeCompare(a.data)).slice(0, 10);
  }, [allPaidReceitasParcelas, allPaidDespesasParcelas, receitaMap, despesaMap]);

  if (contasError) {
    return (
      <div className="p-6 text-center text-red-600">
        <p className="font-medium">Erro ao carregar dados</p>
        <p className="text-sm mt-1">{contasError}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 h-full overflow-auto">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900 mb-0.5">Visão Geral</h2>
        <p className="text-sm text-slate-400">Resumo consolidado de todas as contas e movimentações</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-indigo-600" />
            </div>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${currentMonthNet >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {currentMonthNet >= 0 ? '+' : ''}€{Math.abs(currentMonthNet).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Saldo Total</p>
          {contasLoading ? (
            <div className="h-9 w-36 bg-slate-100 animate-pulse rounded mt-1" />
          ) : (
            <p className="text-3xl font-bold text-slate-900 tabular-nums">
              €{totalSaldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">vs mês anterior</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Receitas Pagas</p>
          {receitas === null ? (
            <div className="h-9 w-36 bg-slate-100 animate-pulse rounded mt-1" />
          ) : (
            <p className="text-3xl font-bold text-green-600 tabular-nums">
              €{currentMonthReceitas.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Parcelas liquidadas este mês</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Despesas Pagas</p>
          {despesas === null ? (
            <div className="h-9 w-36 bg-slate-100 animate-pulse rounded mt-1" />
          ) : (
            <p className="text-3xl font-bold text-red-600 tabular-nums">
              €{currentMonthDespesas.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">Parcelas pagas este mês</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-5">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">Evolução dos Últimos 6 Meses</h3>
          <p className="text-xs text-slate-400 mt-0.5">Receitas e despesas de parcelas liquidadas por mês</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              formatter={(v) => typeof v === 'number' ? `€${v.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}` : ''}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
            <Line type="monotone" dataKey="receitas" name="Receitas" stroke="#16a34a" strokeWidth={2} dot={{ fill: '#16a34a', r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="despesas" name="Despesas" stroke="#dc2626" strokeWidth={2} dot={{ fill: '#dc2626', r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Todas as Contas</h3>
          </div>
          {contasLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-8 bg-slate-100 animate-pulse rounded-lg" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Conta</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Saldo Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(contas ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm text-slate-400 py-8">
                      Nenhuma conta registada
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {(contas ?? []).map(conta => (
                      <TableRow key={conta.id}>
                        <TableCell className="font-medium text-slate-700">{conta.nome}</TableCell>
                        <TableCell className="text-right font-semibold text-slate-900 tabular-nums">
                          €{conta.saldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50">
                      <TableCell className="font-semibold text-slate-700">Total</TableCell>
                      <TableCell className="text-right font-bold text-indigo-600 tabular-nums">
                        €{totalSaldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Atividade Recente</h3>
          </div>
          <div className="max-h-[400px] overflow-auto">
            {receitas === null || despesas === null ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />)}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Nenhuma atividade registada
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentActivity.map(activity => (
                  <li key={activity.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${activity.type === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {activity.type === 'receita' ? 'R' : 'D'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{activity.descricao}</p>
                      <p className="text-xs text-slate-400">{new Date(activity.data).toLocaleDateString('pt-PT')}</p>
                    </div>
                    <p className={`text-sm font-semibold tabular-nums flex-shrink-0 ${activity.type === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                      {activity.type === 'receita' ? '+' : '-'}€{activity.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
