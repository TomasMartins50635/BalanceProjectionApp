import type {
  AdicionarComissaoRequest,
  ColaboradorEstatisticasDto,
  AdicionarParcelaDespesaRequest,
  AtualizarDespesaRequest,
  AtualizarPrevisaoRequest,
  AtualizarReceitaRequest,
  ColaboradorDto,
  ConsistenciaDto,
  ContaDto,
  CorrigirInconsistenciasRequest,
  CriarColaboradorRequest,
  CriarContaRequest,
  CriarDespesaRequest,
  CriarFinanciamentoRequest,
  CriarPrevisaoRequest,
  CriarReceitaRequest,
  DefaultsPrevisaoDto,
  DespesaDto,
  FinanciamentoDto,
  ParcelaDto,
  PrevisaoDto,
  ReceitaDto,
} from './types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

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
    estatisticas: (id: string, inicio: string, fim: string) =>
      request<ColaboradorEstatisticasDto>(`/colaboradores/${id}/estatisticas?inicio=${inicio}&fim=${fim}`),
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
    adicionarComissao: (id: string, body: AdicionarComissaoRequest) =>
      request<{ id: string }>(`/receitas/${id}/comissoes`, { method: 'POST', body: JSON.stringify(body) }),
    removerComissao: (id: string, comissaoId: string) =>
      request<void>(`/receitas/${id}/comissoes/${comissaoId}`, { method: 'DELETE' }),
  },

  despesas: {
    listar: () => request<DespesaDto[]>('/despesas'),
    criar: (body: CriarDespesaRequest) =>
      request<{ id: string }>('/despesas', { method: 'POST', body: JSON.stringify(body) }),
    atualizar: (id: string, body: AtualizarDespesaRequest) =>
      request<void>(`/despesas/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    toggleEstado: (id: string, isActive: boolean) =>
      request<void>(`/despesas/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
    adicionarParcela: (id: string, body: AdicionarParcelaDespesaRequest) =>
      request<void>(`/despesas/${id}/parcelas`, { method: 'POST', body: JSON.stringify(body) }),
    remover: (id: string) =>
      request<void>(`/despesas/${id}`, { method: 'DELETE' }),
  },

  parcelas: {
    listarPorConta: (contaId: string, apenasPendentes?: boolean) => {
      const qs = apenasPendentes != null ? `?apenasPendentes=${apenasPendentes}` : '';
      return request<ParcelaDto[]>(`/parcelas/conta/${contaId}${qs}`);
    },
    liquidar: (id: string, dataPagamento?: string, valorReal?: number, contaId?: string) =>
      request<unknown>(`/parcelas/${id}/liquidar`, {
        method: 'POST',
        body: JSON.stringify({
          dataPagamento: dataPagamento ?? null,
          valorReal: valorReal ?? null,
          contaId: contaId ?? null,
        }),
      }),
    estornar: (id: string) =>
      request<void>(`/parcelas/${id}/estornar`, { method: 'POST' }),
    alterarConta: (id: string, contaId: string) =>
      request<void>(`/parcelas/${id}/conta`, { method: 'PATCH', body: JSON.stringify({ contaId }) }),
    remover: (id: string) =>
      request<void>(`/parcelas/${id}`, { method: 'DELETE' }),
  },

  financiamentos: {
    listarPorConta: (contaId: string) =>
      request<FinanciamentoDto[]>(`/financiamentos/conta/${contaId}`),
    criar: (body: CriarFinanciamentoRequest) =>
      request<{ id: string }>('/financiamentos', { method: 'POST', body: JSON.stringify(body) }),
    eliminar: (id: string) =>
      request<void>(`/financiamentos/${id}`, { method: 'DELETE' }),
  },

  diagnostico: {
    verificarConsistencia: () => request<ConsistenciaDto>('/diagnostico/consistencia'),
    corrigir: (body: CorrigirInconsistenciasRequest) =>
      request<void>('/diagnostico/corrigir', { method: 'POST', body: JSON.stringify(body) }),
  },

  previsoes: {
    listar: (contaId?: string) => {
      const qs = contaId ? `?contaId=${contaId}` : '';
      return request<PrevisaoDto[]>(`/previsoes${qs}`);
    },
    obterDefaults: (contaId?: string) => {
      const qs = contaId ? `?contaId=${contaId}` : '';
      return request<DefaultsPrevisaoDto>(`/previsoes/defaults${qs}`);
    },
    criar: (body: CriarPrevisaoRequest) =>
      request<{ id: string }>('/previsoes', { method: 'POST', body: JSON.stringify(body) }),
    atualizar: (id: string, body: AtualizarPrevisaoRequest) =>
      request<void>(`/previsoes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remover: (id: string) =>
      request<void>(`/previsoes/${id}`, { method: 'DELETE' }),
  },
};
