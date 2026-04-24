// CategoriaContrato mantida para Despesas (enum fixo)
export type CategoriaContrato =
  | 'Servicos'
  | 'Produtos'
  | 'Aluguer'
  | 'Salarios'
  | 'Impostos'
  | 'IVA'
  | 'Financiamento'
  | 'Outro';

export const CATEGORIA_LABELS: Record<CategoriaContrato, string> = {
  Servicos: 'Serviços',
  Produtos: 'Produtos',
  Aluguer: 'Aluguer',
  Salarios: 'Salários',
  Impostos: 'Impostos',
  IVA: 'IVA',
  Financiamento: 'Financiamento',
  Outro: 'Outro',
};

export const CATEGORIAS = Object.keys(CATEGORIA_LABELS) as CategoriaContrato[];

export type TipoDespesa = 'Pontual' | 'Fixa' | 'Recorrente';

export const TIPO_DESPESA_LABELS: Record<TipoDespesa, string> = {
  Pontual: 'Pontual',
  Fixa: 'Fixa',
  Recorrente: 'Recorrente',
};

export type Periodicidade = 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';

export const PERIODICIDADE_LABELS: Record<Periodicidade, string> = {
  Mensal: 'Mensal',
  Trimestral: 'Trimestral',
  Semestral: 'Semestral',
  Anual: 'Anual',
};

// ── Response DTOs ──────────────────────────────────────────────────────────────

export interface ColaboradorDto {
  id: string;
  nome: string;
  percentagem: number;
}

export interface ContaDto {
  id: string;
  nome: string;
  saldo: number;
}

export interface ParcelaDto {
  id: string;
  numero: number;
  /** YYYY-MM-DD */
  dataVencimento: string;
  valorBruto: number;
  valorLiquido: number;
  isPaid: boolean;
  /** YYYY-MM-DD or null */
  dataPagamento: string | null;
  receitaId: string | null;
  despesaId: string | null;
  contaId: string;
  percentagem: number | null;
  nome: string | null;
}

export interface ReceitaDto {
  id: string;
  nome: string;
  /** Categoria livre (string) */
  categoria: string | null;
  contaId: string;
  valorTotal: number;
  colaboradorId: string | null;
  colaboradorNome: string | null;
  percentagemComissao: number | null;
  /** ISO datetime string */
  updatedAt: string;
  parcelas: ParcelaDto[];
}

export interface DespesaDto {
  id: string;
  nome: string;
  categoria: CategoriaContrato | null;
  contaId: string;
  tipoDespesa: TipoDespesa;
  valorFixo: number | null;
  periodicidade: Periodicidade | null;
  dataInicio: string | null;
  isActive: boolean;
  /** ISO datetime string */
  updatedAt: string;
  parcelas: ParcelaDto[];
}

export interface FinanciamentoDto {
  id: string;
  nome: string;
  valor: number;
  /** YYYY-MM-DD */
  data: string;
  contaId: string;
  despesaId: string | null;
  valorMensalidade: number;
  totalParcelas: number;
  parcelasPagas: number;
  valorPago: number;
  valorRestante: number;
  progressoPercentagem: number;
}

// ── Request bodies ─────────────────────────────────────────────────────────────

export interface CriarColaboradorRequest {
  nome: string;
  percentagem: number;
}

export interface CriarContaRequest {
  nome: string;
  saldoInicial?: number;
}

/** Parcela de Receita: usa percentagem do ValorTotal */
export interface CriarReceitaParcelaRequest {
  numero: number;
  /** YYYY-MM-DD */
  dataVencimento: string;
  percentagem: number;
}

/** Parcela de Despesa: usa valor absoluto */
export interface CriarDespesaParcelaRequest {
  numero: number;
  /** YYYY-MM-DD */
  dataVencimento: string;
  valorBruto: number;
}

export interface CriarReceitaRequest {
  nome: string;
  contaId: string;
  valorTotal: number;
  categoria?: string;
  colaboradorId?: string;
  parcelas: CriarReceitaParcelaRequest[];
  temIva?: boolean;
}

export interface AtualizarReceitaRequest {
  nome: string;
  valorTotal: number;
  categoria?: string;
  colaboradorId?: string;
  parcelas: CriarReceitaParcelaRequest[];
}

export interface CriarDespesaRequest {
  nome: string;
  contaId: string;
  categoria?: CategoriaContrato;
  tipoDespesa: TipoDespesa;
  // Pontual / Recorrente (valor base / previsto)
  parcelas?: CriarDespesaParcelaRequest[];
  // Fixa / Recorrente
  valorFixo?: number;
  periodicidade?: Periodicidade;
  dataInicio?: string;
}

export interface AtualizarDespesaRequest {
  nome: string;
  categoria?: CategoriaContrato;
}

export interface AdicionarParcelaDespesaRequest {
  /** YYYY-MM-DD */
  dataVencimento: string;
  valorBruto: number;
}

export interface CriarFinanciamentoRequest {
  nome: string;
  valor: number;
  contaId: string;
  valorMensalidade: number;
}
