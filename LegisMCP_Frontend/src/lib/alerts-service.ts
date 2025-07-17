import { useSession } from 'next-auth/react';

export interface Alert {
  id: string;
  alert_type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  endpoint?: string;
  error_code?: string;
  affected_users_count: number;
  is_resolved: boolean;
  is_read: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ErrorEvent {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  component: string;
  endpoint?: string;
  method?: string;
  status_code?: number;
  user_id?: number;
  user_email?: string;
  error_count: number;
  first_occurrence: string;
  last_occurrence: string;
  status: 'open' | 'investigating' | 'resolved';
  assigned_to?: string;
  resolution_notes?: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}

export interface AlertMetrics {
  overview: {
    total_alerts: number;
    unresolved_alerts: number;
    critical_alerts: number;
    high_alerts: number;
    alerts_last_24h: number;
    alerts_last_hour: number;
  };
  by_component: Array<{
    component: string;
    alert_count: number;
    unresolved_count: number;
  }>;
}

export interface AlertQueryParams {
  limit?: number;
  offset?: number;
  type?: 'error' | 'warning' | 'info' | 'success';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  component?: string;
  resolved?: boolean;
  read?: boolean;
}

export interface ErrorEventQueryParams {
  limit?: number;
  offset?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  component?: string;
  status?: 'open' | 'investigating' | 'resolved';
  from_date?: string;
  to_date?: string;
}

class AlertsService {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8789';
  }

  async setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getAlerts(params: AlertQueryParams = {}): Promise<{
    data: Alert[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.type) queryParams.append('type', params.type);
    if (params.severity) queryParams.append('severity', params.severity);
    if (params.component) queryParams.append('component', params.component);
    if (params.resolved !== undefined) queryParams.append('resolved', params.resolved.toString());
    if (params.read !== undefined) queryParams.append('read', params.read.toString());

    const endpoint = `/api/alerts?${queryParams.toString()}`;
    const result = await this.makeRequest(endpoint);
    
    return {
      data: result.data || [],
      pagination: result.pagination || {
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false
      }
    };
  }

  async createAlert(alertData: Omit<Alert, 'id' | 'created_at' | 'updated_at' | 'is_resolved' | 'is_read'>): Promise<{ id: string }> {
    const result = await this.makeRequest('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
    
    return result.data;
  }

  async updateAlert(id: string, updates: {
    is_resolved?: boolean;
    is_read?: boolean;
    resolved_by?: string;
    resolution_notes?: string;
  }): Promise<void> {
    await this.makeRequest(`/api/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getAlertMetrics(): Promise<AlertMetrics> {
    const result = await this.makeRequest('/api/alerts/metrics');
    return result.data;
  }

  async getErrorEvents(params: ErrorEventQueryParams = {}): Promise<ErrorEvent[]> {
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.severity) queryParams.append('severity', params.severity);
    if (params.component) queryParams.append('component', params.component);
    if (params.status) queryParams.append('status', params.status);
    if (params.from_date) queryParams.append('from_date', params.from_date);
    if (params.to_date) queryParams.append('to_date', params.to_date);

    const endpoint = `/api/alerts/error-events?${queryParams.toString()}`;
    const result = await this.makeRequest(endpoint);
    
    return result.data || [];
  }

  async createErrorEvent(errorData: Omit<ErrorEvent, 'id' | 'created_at' | 'updated_at' | 'error_count' | 'first_occurrence' | 'last_occurrence' | 'status'>): Promise<{ id: string }> {
    const result = await this.makeRequest('/api/alerts/error-events', {
      method: 'POST',
      body: JSON.stringify(errorData),
    });
    
    return result.data;
  }
}

// Custom hook for using alerts service
export function useAlertsService() {
  const { data: session } = useSession();
  const user = session?.user;
  const service = new AlertsService();

  const initializeService = async () => {
    if (user) {
      try {
        // For now, use service without access token - in production you'd get the token
        // const token = await getAccessTokenSilently({
        //   audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'urn:legis-api',
        //   scope: 'read:alerts write:alerts'
        // });
        // await service.setAccessToken(token);
        return service;
      } catch (error) {
        console.error('Failed to initialize service:', error);
        throw error;
      }
    }
    throw new Error('User not authenticated');
  };

  return {
    service,
    initializeService,
    isAuthenticated: !!user
  };
}

export default AlertsService;