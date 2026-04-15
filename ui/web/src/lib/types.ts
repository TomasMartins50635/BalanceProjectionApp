// CategoriaContrato mantida para Despesas (enum fixo)
export type CategoriaContrato =
  | 'Servicos'
  | 'Produtos'
  | 'Aluguer'
  | 'Salarios'
  | 'Impostos'
  | 'Financiamento'
  | 'Outro';

export const CATEGORIA_LABELS: Record<CategoriaContrato, string> = {
  Servicos: 'Serviços',
  Produtos: 'Produtos',
  Aluguer: 'Aluguer',
  Salarios: 'Salários',
  Impostos: 'Impostos',
  Financiamento: 'Financiamento',
  Outro: 'Outro',
};

export const CATEGORIAS = Object.keys(CATEGORIA_LABELS) as CategoriaContrato[];

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
  percentagem: number | null;
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
  parcelas: ParcelaDto[];
}

export interface DespesaDto {
  id: string;
  nome: string;
  categoria: CategoriaContrato | null;
  contaId: string;
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
  parcelas: CriarDespesaParcelaRequest[];
}

export interface CriarFinanciamentoRequest {
  nome: string;
  valor: number;
  /** YYYY-MM-DD */
  data: string;
  contaId: string;
  despesaId?: string;
}
