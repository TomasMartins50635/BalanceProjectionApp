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
}

export interface ReceitaDto {
  id: string;
  nome: string;
  categoria: CategoriaContrato | null;
  contaId: string;
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

export interface CriarContaRequest {
  nome: string;
  saldoInicial?: number;
}

export interface CriarParcelaRequest {
  numero: number;
  /** YYYY-MM-DD */
  dataVencimento: string;
  valorBruto: number;
}

export interface CriarReceitaRequest {
  nome: string;
  contaId: string;
  categoria?: CategoriaContrato;
  percentagemComissao?: number;
  parcelas: CriarParcelaRequest[];
}

export interface CriarDespesaRequest {
  nome: string;
  contaId: string;
  categoria?: CategoriaContrato;
  parcelas: CriarParcelaRequest[];
}

export interface CriarFinanciamentoRequest {
  nome: string;
  valor: number;
  /** YYYY-MM-DD */
  data: string;
  contaId: string;
  despesaId?: string;
}
