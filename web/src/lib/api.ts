import type {
  ContaDto,
  CriarContaRequest,
  CriarDespesaRequest,
  CriarFinanciamentoRequest,
  CriarReceitaRequest,
  DespesaDto,
  FinanciamentoDto,
  ParcelaDto,
  ReceitaDto,
} from './types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { title?: string };
    throw new Error(body.title ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  contas: {
    listar: () => request<ContaDto[]>('/contas'),
    obter: (id: string) => request<ContaDto>(`/contas/${id}`),
    criar: (body: CriarContaRequest) =>
      request<{ id: string }>('/contas', { method: 'POST', body: JSON.stringify(body) }),
  },

  receitas: {
    listar: () => request<ReceitaDto[]>('/receitas'),
    criar: (body: CriarReceitaRequest) =>
      request<{ id: string }>('/receitas', { method: 'POST', body: JSON.stringify(body) }),
  },

  despesas: {
    listar: () => request<DespesaDto[]>('/despesas'),
    criar: (body: CriarDespesaRequest) =>
      request<{ id: string }>('/despesas', { method: 'POST', body: JSON.stringify(body) }),
  },

  parcelas: {
    listarPorConta: (contaId: string, apenasPendentes?: boolean) => {
      const qs = apenasPendentes != null ? `?apenasPendentes=${apenasPendentes}` : '';
      return request<ParcelaDto[]>(`/parcelas/conta/${contaId}${qs}`);
    },
    liquidar: (id: string) =>
      request<unknown>(`/parcelas/${id}/liquidar`, { method: 'POST' }),
  },

  financiamentos: {
    listarPorConta: (contaId: string) =>
      request<FinanciamentoDto[]>(`/financiamentos/conta/${contaId}`),
    criar: (body: CriarFinanciamentoRequest) =>
      request<{ id: string }>('/financiamentos', { method: 'POST', body: JSON.stringify(body) }),
  },
};
