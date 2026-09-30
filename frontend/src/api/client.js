const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const apiKey = import.meta.env.VITE_API_KEY || '';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function url(path, params = {}) {
  const target = new URL(`${baseUrl}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      target.searchParams.set(key, value);
    }
  });
  return target;
}

async function request(path, { method = 'GET', params, body, authenticated = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (authenticated) headers['X-API-Key'] = apiKey;
  if (body) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(url(path, params), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Não foi possível conectar à API.', 0);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.erro || `Erro HTTP ${response.status}`, response.status);
  }
  return data;
}

async function allPages(fetchPage) {
  const result = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await fetchPage(page);
    result.push(...response.dados);
    totalPages = response.paginacao.totalPages;
    page += 1;
  } while (page <= totalPages);
  return result;
}

export const api = {
  baseUrl,
  configured: Boolean(apiKey),
  health: () => request('/health', { authenticated: false }),

  clientes: {
    list: (params) => request('/api/clientes', { params }),
    get: (id) => request(`/api/clientes/${id}`),
    create: (body) => request('/api/clientes', { method: 'POST', body }),
    all: () => allPages((page) => request('/api/clientes', { params: { page, limit: 100 } })),
  },

  produtos: {
    list: (params) => request('/api/produtos', { params }),
    get: (id) => request(`/api/produtos/${id}`),
    create: (body) => request('/api/produtos', { method: 'POST', body }),
    all: () => allPages((page) => request('/api/produtos', { params: { page, limit: 100 } })),
  },

  pedidos: {
    list: (params) => request('/api/pedidos', { params }),
    get: (id) => request(`/api/pedidos/${id}`),
    create: (body) => request('/api/pedidos', { method: 'POST', body }),
    all: (params = {}) => allPages((page) => request('/api/pedidos', {
      params: { ...params, page, limit: 100 },
    })),
  },
};
