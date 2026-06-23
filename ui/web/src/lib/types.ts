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

// ── Colaborador enums ──────────────────────────────────────────────────────────

export type TipoColaborador = 'Comercial' | 'Servico';
export type TipoComissao = 'Venda' | 'Angariacao' | 'Servico';

export const TIPO_COLABORADOR_LABELS: Record<TipoColaborador, string> = {
  Comercial: 'Comercial',
  Servico: 'Serviço',
};

export const TIPO_COMISSAO_LABELS: Record<TipoComissao, string> = {
  Venda: 'Venda',
  Angariacao: 'Angariação',
  Servico: 'Serviço',
};

// ── Response DTOs ──────────────────────────────────────────────────────────────

export interface ColaboradorDto {
  id: string;
  nome: string;
  tipo: TipoColaborador;
  percentagemVenda: number | null;
  percentagemAngariacao: number | null;
  percentagemServico: number | null;
}

export interface ReceitaComissaoDto {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  tipoComissao: TipoComissao;
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
  /** ISO datetime string */
  updatedAt: string;
  parcelas: ParcelaDto[];
  comissoes: ReceitaComissaoDto[];
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

export interface ComissaoInputRequest {
  colaboradorId: string;
  tipoComissao: TipoComissao;
  percentagem: number;
}

export interface AdicionarComissaoRequest {
  colaboradorId: string;
  tipoComissao: TipoComissao;
  percentagem: number;
}

export interface CriarColaboradorRequest {
  nome: string;
  tipo: TipoColaborador;
  percentagemVenda?: number;
  percentagemAngariacao?: number;
  percentagemServico?: number;
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
  temIva?: boolean;
  parcelas: CriarReceitaParcelaRequest[];
  comissoes?: ComissaoInputRequest[];
}

export interface AtualizarReceitaRequest {
  nome: string;
  categoria?: CategoriaReceita;
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
  nome?: string;
  categoria?: CategoriaContrato;
  valorFixo?: number;
  periodicidade?: Periodicidade;
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
  creditarConta?: boolean;
}

// ── Colaborador Estatísticas ───────────────────────────────────────────────────

export interface ParcelaParticipacaoDto {
  id: string;
  numero: number;
  dataVencimento: string;
  dataPagamento: string | null;
  valorBruto: number;
  valorComissao: number;
  isPaid: boolean;
}

export interface ReceitaParticipacaoDto {
  receitaId: string;
  receitaNome: string;
  categoria: string | null;
  tipoComissao: string;
  percentagem: number;
  recebidoPeriodo: number;
  pendente: number;
  parcelas: ParcelaParticipacaoDto[];
}

export interface EstatisticasTipoComissaoDto {
  tipoComissao: string;
  recebidoPeriodo: number;
  pendente: number;
  parcelasPagasPeriodo: number;
  parcelasPendentes: number;
}

export interface ColaboradorEstatisticasDto {
  id: string;
  nome: string;
  tipo: TipoColaborador;
  dataInicio: string;
  dataFim: string;
  totalRecebidoPeriodo: number;
  totalPendente: number;
  totalRecebidoGlobal: number;
  receitasCount: number;
  parcelasPagasPeriodo: number;
  parcelasPendentes: number;
  porTipo: EstatisticasTipoComissaoDto[];
  receitas: ReceitaParticipacaoDto[];
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
