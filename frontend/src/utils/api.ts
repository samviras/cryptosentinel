const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('cs_token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('cs_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('cs_token');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.clearToken();
      window.location.reload();
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ access_token: string; user_id: string; email: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    this.setToken(data.access_token);
    return data;
  }

  async register(email: string, password: string, companyName?: string) {
    const data = await this.request<{ access_token: string; user_id: string; email: string }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ email, password, company_name: companyName }) }
    );
    this.setToken(data.access_token);
    return data;
  }

  // Prices
  async getPrices(symbols?: string) {
    const params = symbols ? `?symbols=${symbols}` : '';
    return this.request<{ prices: any[]; count: number }>(`/prices${params}`);
  }

  async getPriceHistory(symbol: string, days = 7) {
    return this.request<{ symbol: string; data: any[]; count: number }>(
      `/prices/history/${symbol}?days=${days}`
    );
  }

  // Alerts
  async getAlerts(type?: string, severity?: string, unread = false) {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (severity) params.set('severity', severity);
    if (unread) params.set('unread', 'true');
    const qs = params.toString();
    return this.request<{ alerts: any[]; count: number }>(`/alerts${qs ? '?' + qs : ''}`);
  }

  async markAlertsRead(ids: string[]) {
    return this.request('/alerts/read', { method: 'POST', body: JSON.stringify(ids) });
  }

  // Analysis
  async getAnalysis(symbol: string) {
    return this.request<any>(`/analysis/${symbol}`);
  }

  // API Keys
  async getApiKeys() {
    return this.request<any[]>('/auth/api-keys');
  }

  async createApiKey(name: string, expiresInDays = 90) {
    return this.request<any>('/auth/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name, expires_in_days: expiresInDays }),
    });
  }

  async revokeApiKey(id: string) {
    return this.request(`/auth/api-keys/${id}`, { method: 'DELETE' });
  }

  // Fear & Greed
  async getFearGreed() {
    return this.request<any>('/market/fear-greed');
  }

  // Price Alerts
  async getPriceAlerts() {
    return this.request<{ alerts: any[]; count: number }>('/price-alerts');
  }

  async createPriceAlert(symbol: string, target_price: number, direction: 'above' | 'below') {
    return this.request<any>('/price-alerts', {
      method: 'POST',
      body: JSON.stringify({ symbol, target_price, direction }),
    });
  }

  async deletePriceAlert(id: string) {
    return this.request(`/price-alerts/${id}`, { method: 'DELETE' });
  }

  // Portfolio
  async getPortfolio() {
    return this.request<any>('/portfolio');
  }

  async addHolding(symbol: string, amount: number, buy_price: number) {
    return this.request<any>('/portfolio', {
      method: 'POST',
      body: JSON.stringify({ symbol, amount, buy_price }),
    });
  }

  async deleteHolding(id: string) {
    return this.request(`/portfolio/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
