// Em dev, o Vite proxy roteia /api para o backend (mesma origem, sem mixed content).
// Em produção, definir VITE_API_URL com o endereço do backend.
const API_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  // Se for FormData, remover Content-Type (browser define automaticamente com boundary)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ erro: 'Erro desconhecido' }));
    throw new Error(error.erro || `HTTP ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

// === Dispositivos ===
export const dispositivosApi = {
  listar: () => request('/api/dispositivos'),
  buscar: (id) => request(`/api/dispositivos/${id}`),
  criar: (dados) => request('/api/dispositivos', {
    method: 'POST',
    body: JSON.stringify(dados),
  }),
  atualizar: (id, dados) => request(`/api/dispositivos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  }),
};

// === Eventos ===
export const eventosApi = {
  registrar: (formData) => request('/api/eventos', {
    method: 'POST',
    body: formData,
  }),
  listar: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/eventos?${query}`);
  },
  estatisticas: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/eventos/estatisticas?${query}`);
  },
};

// === Ocupação ===
export const ocupacaoApi = {
  obter: (localizacao = 'principal') =>
    request(`/api/ocupacao?localizacao=${localizacao}`),
  resetar: (contagem = 0, localizacao = 'principal') =>
    request('/api/ocupacao/resetar', {
      method: 'POST',
      body: JSON.stringify({ localizacao, contagem }),
    }),
};

// === Health ===
export const healthApi = {
  check: () => request('/api/health'),
};

export { API_URL };
