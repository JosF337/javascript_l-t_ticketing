import { Injectable } from '@angular/core';
import { User, Ticket, CommentItem, SlaRule, Rating, SlaComplianceReport, AgentWorkloadReport, VolumeTrendsReport, CategoryBreakdownReport } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiBase = '/api';

  private getToken(): string | null {
    return localStorage.getItem('helpdesk_token');
  }

  private async request<T>(endpoint: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const config: RequestInit = {
      method: options.method || 'GET',
      headers
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${this.apiBase}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error: any = new Error(data.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.errorCode = data.errorCode || 'UNKNOWN_ERROR';
      error.data = data;
      throw error;
    }

    return data as T;
  }

  // Authentication (Module 1)
  auth = {
    register: (userData: any) => this.request<{ success: boolean; data: User; token: string }>('/auth/register', { method: 'POST', body: userData }),
    login: (credentials: any) => this.request<{ success: boolean; data: User; token: string }>('/auth/login', { method: 'POST', body: credentials }),
    getMe: () => this.request<{ success: boolean; data: User }>('/auth/me')
  };

  // Tickets (Modules 2, 3, 4, 6, 9)
  tickets = {
    list: (params: { status?: string; priority?: string; category?: string; breached?: string } = {}) => {
      const query = new URLSearchParams();
      if (params.status) query.set('status', params.status);
      if (params.priority) query.set('priority', params.priority);
      if (params.category) query.set('category', params.category);
      if (params.breached) query.set('breached', params.breached);
      const queryString = query.toString() ? `?${query.toString()}` : '';
      return this.request<{ success: boolean; count: number; data: Ticket[] }>(`/tickets${queryString}`);
    },
    getById: (id: string) => this.request<{ success: boolean; data: Ticket }>(`/tickets/${id}`),
    create: (ticketData: any) => this.request<{ success: boolean; data: Ticket }>('/tickets', { method: 'POST', body: ticketData }),
    updateStatus: (id: string, status: string) => this.request<{ success: boolean; data: Ticket }>(`/tickets/${id}/status`, { method: 'PUT', body: { status } }),
    assign: (id: string, agentId: string) => this.request<{ success: boolean; data: Ticket }>(`/tickets/${id}/assign`, { method: 'PUT', body: { agentId } }),
    autoAssign: (id: string) => this.request<{ success: boolean; data: Ticket }>(`/tickets/${id}/auto-assign`, { method: 'PUT' }),
    escalate: (id: string, reason: string) => this.request<{ success: boolean; data: Ticket }>(`/tickets/${id}/escalate`, { method: 'PUT', body: { reason } }),
    checkBreaches: () => this.request<{ success: boolean; breachedCount: number; message: string }>('/tickets/breaches/check')
  };

  // Comments & Notes (Modules 7 & 8)
  comments = {
    list: (ticketId: string) => this.request<{ success: boolean; count: number; data: CommentItem[] }>(`/tickets/${ticketId}/comments`),
    add: (ticketId: string, message: string, isInternal = false) =>
      this.request<{ success: boolean; data: CommentItem }>(`/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: { message, isInternal }
      })
  };

  // SLA Management (Module 10)
  sla = {
    list: () => this.request<{ success: boolean; count: number; data: SlaRule[] }>('/sla'),
    create: (rule: Partial<SlaRule>) => this.request<{ success: boolean; data: SlaRule }>('/sla', { method: 'POST', body: rule }),
    update: (id: string, rule: Partial<SlaRule>) => this.request<{ success: boolean; data: SlaRule }>(`/sla/${id}`, { method: 'PUT', body: rule }),
    delete: (id: string) => this.request<{ success: boolean; message: string }>(`/sla/${id}`, { method: 'DELETE' })
  };

  // Ratings (Module 11)
  ratings = {
    create: (ratingData: { ticketId: string; score: number; comment?: string }) => this.request<{ success: boolean; data: Rating }>('/ratings', { method: 'POST', body: ratingData }),
    getByTicket: (ticketId: string) => this.request<{ success: boolean; data: Rating }>(`/ratings/ticket/${ticketId}`),
    list: () => this.request<{ success: boolean; count: number; data: Rating[] }>('/ratings')
  };

  // Manager BI Analytics (Modules 12 & 13)
  reports = {
    getSlaCompliance: () => this.request<{ success: boolean; data: SlaComplianceReport }>('/manager/reports/sla'),
    getAgentWorkload: () => this.request<{ success: boolean; count: number; data: AgentWorkloadReport[] }>('/manager/reports/agent-workload'),
    getVolumeTrends: () => this.request<{ success: boolean; data: VolumeTrendsReport[] }>('/manager/reports/volume-trends'),
    getCategoryBreakdown: () => this.request<{ success: boolean; data: CategoryBreakdownReport[] }>('/manager/reports/category-breakdown')
  };
}
