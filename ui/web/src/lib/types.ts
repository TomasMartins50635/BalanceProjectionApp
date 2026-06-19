// CategoriaReceita — enum estático para Receitas
export type CategoriaReceita = 'Vendas' | 'Arrendamentos' | 'Outros';

export const CATEGORIA_RECEITA_LABELS: Record<CategoriaReceita, string> = {
  Vendas: 'Vendas',
  Arrendamentos: 'Arrendamentos',
  Outros: 'Outros',
};

export const CATEGORIAS_RECEITA = Object.keys(CATEGORIA_RECEITA_LABELS) as CategoriaReceita[];

// CategoriaContrato — enum para Despesas (sem Aluguer)
export type CategoriaContrato =
  | 'Servicos'
  | 'Produtos'
  | 'Salarios'
  | 'Impostos'
  | 'IVA'
  | 'Financiamento'
  | 'Outro';

export const CATEGORIA_LABELS: Record<CategoriaContrato, string> = {
  Servicos: 'Serviços',
  Produtos: 'Produtos',
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
  categoria: CategoriaReceita | null;
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
  valorPrestacao: number;
  periodicidade: Periodicidade | null;
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

export interface CriarReceitaParcelaRequest {
  numero: number;
  /** YYYY-MM-DD */
  dataVencimento: string;
  valor: number;
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
  categoria?: CategoriaReceita;
  colaboradorId?: string;
  parcelas: CriarReceitaParcelaRequest[];
  temIva?: boolean;
}

export interface AtualizarReceitaRequest {
  nome: string;
  categoria?: CategoriaReceita;
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
  valorPrestacao: number;
  periodicidade: Periodicidade;
  dataPrimeiraParcela: string;
}

// ── Previsão ───────────────────────────────────────────────────────────────────

export interface PrevisaoDto {
  id: string;
  nome: string;
  contaId: string | null;
  diasEntreVendas: number | null;
  valorMedioVenda: number | null;
  diasEntreArrendamentos: number | null;
  valorMedioArrendamento: number | null;
  criadoEm: string;
}

export interface DefaultsPrevisaoDto {
  diasEntreVendas: number | null;
  valorMedioVenda: number | null;
  diasEntreArrendamentos: number | null;
  valorMedioArrendamento: number | null;
}

export interface CriarPrevisaoRequest {
  nome: string;
  contaId: string | null;
  diasEntreVendas: number | null;
  valorMedioVenda: number | null;
  diasEntreArrendamentos: number | null;
  valorMedioArrendamento: number | null;
}

export interface AtualizarPrevisaoRequest {
  nome: string;
  diasEntreVendas: number | null;
  valorMedioVenda: number | null;
  diasEntreArrendamentos: number | null;
  valorMedioArrendamento: number | null;
}
