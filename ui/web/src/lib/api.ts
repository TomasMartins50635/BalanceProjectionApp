import type {
  AtualizarReceitaRequest,
  ColaboradorDto,
  ContaDto,
  CriarColaboradorRequest,
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

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  colaboradores: {
    listar: () => request<ColaboradorDto[]>('/colaboradores'),
    criar: (body: CriarColaboradorRequest) =>
      request<{ id: string }>('/colaboradores', { method: 'POST', body: JSON.stringify(body) }),
    eliminar: (id: string) =>
      request<void>(`/colaboradores/${id}`, { method: 'DELETE' }),
  },

  contas: {
    listar: () => request<ContaDto[]>('/contas'),
    obter: (id: string) => request<ContaDto>(`/contas/${id}`),
    criar: (body: CriarContaRequest) =>
      request<{ id: string }>('/contas', { method: 'POST', body: JSON.stringify(body) }),
    eliminar: (id: string) =>
      request<void>(`/contas/${id}`, { method: 'DELETE' }),
  },

  receitas: {
    listar: () => request<ReceitaDto[]>('/receitas'),
    criar: (body: CriarReceitaRequest) =>
      request<{ id: string }>('/receitas', { method: 'POST', body: JSON.stringify(body) }),
    atualizar: (id: string, body: AtualizarReceitaRequest) =>
      request<void>(`/receitas/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remover: (id: string) =>
      request<void>(`/receitas/${id}`, { method: 'DELETE' }),
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
    liquidar: (id: string, dataPagamento?: string) =>
      request<unknown>(`/parcelas/${id}/liquidar`, {
        method: 'POST',
        body: JSON.stringify({ dataPagamento: dataPagamento ?? null }),
      }),
  },

  financiamentos: {
    listarPorConta: (contaId: string) =>
      request<FinanciamentoDto[]>(`/financiamentos/conta/${contaId}`),
    criar: (body: CriarFinanciamentoRequest) =>
      request<{ id: string }>('/financiamentos', { method: 'POST', body: JSON.stringify(body) }),
  },
};
