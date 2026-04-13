import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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

  // Chart: group paid parcelas by month for the last 6 months
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

  // Current month KPIs
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthReceitas = allPaidReceitasParcelas
    .filter(p => p.dataPagamento?.startsWith(currentMonthPrefix))
    .reduce((s, p) => s + p.valorLiquido, 0);
  const currentMonthDespesas = allPaidDespesasParcelas
    .filter(p => p.dataPagamento?.startsWith(currentMonthPrefix))
    .reduce((s, p) => s + p.valorLiquido, 0);
  const currentMonthNet = currentMonthReceitas - currentMonthDespesas;

  // Recent activity: last 10 paid parcelas across all entities, sorted by dataPagamento desc
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
    <div className="p-4 md:p-6 bg-gray-50 h-full overflow-auto">
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-1">Visão Geral</h2>
        <p className="text-xs md:text-sm text-gray-600">Resumo consolidado de todas as contas e movimentações</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-medium text-gray-600">SALDO TOTAL (TODAS AS CONTAS)</p>
          </div>
          {contasLoading ? (
            <div className="h-9 w-36 bg-gray-100 animate-pulse rounded mt-2" />
          ) : (
            <p className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
              €{totalSaldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </p>
          )}
          <div className={`flex items-center gap-1 text-sm ${currentMonthNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {currentMonthNet >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span className="font-medium">
              {currentMonthNet >= 0 ? '+' : ''}€{Math.abs(currentMonthNet).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-gray-500">este mês</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-xs font-medium text-gray-600">RECEITAS PAGAS (MÊS ATUAL)</p>
          </div>
          {receitas === null ? (
            <div className="h-9 w-36 bg-gray-100 animate-pulse rounded mt-2" />
          ) : (
            <p className="text-2xl md:text-3xl font-semibold text-green-600 mb-2">
              €{currentMonthReceitas.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-xs text-gray-500">Parcelas liquidadas este mês</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <p className="text-xs font-medium text-gray-600">DESPESAS PAGAS (MÊS ATUAL)</p>
          </div>
          {despesas === null ? (
            <div className="h-9 w-36 bg-gray-100 animate-pulse rounded mt-2" />
          ) : (
            <p className="text-2xl md:text-3xl font-semibold text-red-600 mb-2">
              €{currentMonthDespesas.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-xs text-gray-500">Parcelas pagas este mês</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm mb-4 md:mb-6">
        <div className="mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Evolução dos Últimos 6 Meses</h3>
          <p className="text-xs md:text-sm text-gray-600 mt-1">Receitas e despesas de parcelas liquidadas por mês</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
            <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '12px' }}
              formatter={(v) => typeof v === 'number' ? `€${v.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}` : ''}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey="receitas" name="Receitas" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
            <Line type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">TODAS AS CONTAS</h3>
          </div>
          {contasLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Saldo Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(contas ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm text-gray-500 py-8">
                      Nenhuma conta registada
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {(contas ?? []).map(conta => (
                      <TableRow key={conta.id}>
                        <TableCell className="font-medium">{conta.nome}</TableCell>
                        <TableCell className="text-right font-semibold">
                          €{conta.saldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 font-semibold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right text-blue-600">
                        €{totalSaldo.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">ATIVIDADE RECENTE</h3>
          </div>
          <div className="max-h-[400px] overflow-auto">
            {receitas === null || despesas === null ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />)}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Nenhuma atividade registada
              </div>
            ) : (
              <Table>
                <TableBody>
                  {recentActivity.map(activity => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${activity.type === 'receita' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {activity.type === 'receita' ? 'R' : 'D'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{activity.descricao}</p>
                            <p className="text-xs text-gray-500">{new Date(activity.data).toLocaleDateString('pt-PT')}</p>
                          </div>
                          <p className={`text-sm font-semibold ${activity.type === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                            {activity.type === 'receita' ? '+' : '-'}€{activity.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
