const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Universal API Client with automatic JWT Token Injection
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('helpdesk_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.errorCode = data.errorCode || 'UNKNOWN_ERROR';
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Authentication (Module 1)
  auth: {
    register: (userData) => request('/auth/register', { method: 'POST', body: userData }),
    login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
    getMe: () => request('/auth/me')
  },

  // Tickets (Modules 2, 3, 4, 6, 9)
  tickets: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.status) query.set('status', params.status);
      if (params.priority) query.set('priority', params.priority);
      if (params.category) query.set('category', params.category);
      if (params.breached) query.set('breached', params.breached);
      const queryString = query.toString() ? `?${query.toString()}` : '';
      return request(`/tickets${queryString}`);
    },
    getById: (id) => request(`/tickets/${id}`),
    create: (ticketData) => request('/tickets', { method: 'POST', body: ticketData }),
    updateStatus: (id, status) => request(`/tickets/${id}/status`, { method: 'PUT', body: { status } }),
    assign: (id, agentId) => request(`/tickets/${id}/assign`, { method: 'PUT', body: { agentId } }),
    autoAssign: (id) => request(`/tickets/${id}/auto-assign`, { method: 'PUT' }),
    escalate: (id, reason) => request(`/tickets/${id}/escalate`, { method: 'PUT', body: { reason } }),
    checkBreaches: () => request('/tickets/breaches/check')
  },

  // Comments & Notes (Modules 7 & 8)
  comments: {
    list: (ticketId) => request(`/tickets/${ticketId}/comments`),
    add: (ticketId, message, isInternal = false) =>
      request(`/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: { message, isInternal }
      })
  },

  // SLA Management (Module 10)
  sla: {
    list: () => request('/sla'),
    create: (rule) => request('/sla', { method: 'POST', body: rule }),
    update: (id, rule) => request(`/sla/${id}`, { method: 'PUT', body: rule }),
    delete: (id) => request(`/sla/${id}`, { method: 'DELETE' })
  },

  // Ratings (Module 11)
  ratings: {
    create: (ratingData) => request('/ratings', { method: 'POST', body: ratingData }),
    getByTicket: (ticketId) => request(`/ratings/ticket/${ticketId}`),
    list: () => request('/ratings')
  },

  // Manager BI Analytics (Modules 12 & 13)
  reports: {
    getSlaCompliance: () => request('/manager/reports/sla'),
    getAgentWorkload: () => request('/manager/reports/agent-workload'),
    getVolumeTrends: () => request('/manager/reports/volume-trends'),
    getCategoryBreakdown: () => request('/manager/reports/category-breakdown')
  }
};
