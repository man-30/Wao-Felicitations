/**
 * API Configuration
 * Centralized API client for backend communication
 */

// Determine API URL based on environment
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' 
    ? 'https://wao-felicitations-api.fly.dev'
    : 'http://localhost:3001');

export const api = {
  baseURL: API_URL,
  
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = sessionStorage.getItem('auth_token');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        errorJson = { error: `HTTP ${response.status}: ${errorText.slice(0, 50)}...` };
      }
      throw new Error(errorJson.error || `Erreur ${response.status} sur ${endpoint}`);
    }

    return response.json();
  },

  // Auth
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // Dashboard
  async getDashboardStats() {
    return this.request<any>('/api/dashboard/stats');
  },

  // Clients
  async getClients() {
    return this.request<any[]>('/api/clients');
  },

  async getMyClients() {
    return this.request<any[]>('/api/clients/me');
  },

  async createClient(data: any) {
    return this.request<any>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createApprenant(data: any) {
    return this.request<any>('/api/apprenants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createNonApprenant(data: any) {
    return this.request<any>('/api/non-apprenants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getClient(id: string) {
    return this.request<any>(`/api/clients/${id}`);
  },

  async deleteClient(id: string) {
    return this.request<any>(`/api/clients/${id}`, {
      method: 'DELETE',
    });
  },

  async reassignClient(clientId: string, assignedCommercialId: string) {
    return this.request<any>(`/api/clients/${clientId}/reassign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedCommercialId }),
    });
  },

  async bulkReassignClients(fromUserId: string, toCommercialId: string) {
    return this.request<any>('/api/admin/bulk-reassign-clients', {
      method: 'POST',
      body: JSON.stringify({ fromUserId, toCommercialId }),
    });
  },
  
  async wipeClients() {
    return this.request<any>('/api/admin/wipe-clients', { method: 'DELETE' });
  },

  async deleteClientsByZone(zone: string) {
    return this.request<any>('/api/admin/clients-by-zone', {
      method: 'DELETE',
      body: JSON.stringify({ zone }),
    });
  },

  async bulkDeletePreview(filters: {
    zone?: string;
    commercialId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    clientIds?: string[];
  }) {
    return this.request<{ count: number; clients: any[]; message?: string }>(
      '/api/admin/bulk-delete-preview',
      { method: 'POST', body: JSON.stringify(filters) }
    );
  },

  async bulkDeleteClients(filters: {
    zone?: string;
    commercialId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    clientIds?: string[];
  }) {
    return this.request<{ deleted: number; message: string }>(
      '/api/admin/bulk-delete-clients',
      { method: 'DELETE', body: JSON.stringify(filters) }
    );
  },

  async setMiseJournaliere(clientId: string, amount: number) {
    return this.request<any>(`/api/clients/${clientId}/mise-journaliere`, {
      method: 'PUT',
      body: JSON.stringify({ amount }),
    });
  },

  // Transactions
  async getTransactions() {
    return this.request<any[]>('/api/transactions');
  },

  async createTransaction(data: any) {
    return this.request<any>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Audit Logs
  async getAuditLogs(params?: { limit?: number; userId?: string; action?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{ count: number; logs: any[] }>(`/api/audit-logs?${query}`);
  },

  // Users
  async getUsers() {
    return this.request<any[]>('/api/users');
  },

  async createUser(data: any) {
    return this.request<any>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export default api;
