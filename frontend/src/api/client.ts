import type { HierarchyNode, HierarchyNodeCreateInput } from '../types/hierarchy';

const BASE_URL =
  `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/v1`; 

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  const token = localStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options?.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  auth: {
    getConfig: () => request<{ jwt_enabled: boolean; sso_enabled: boolean }>('/auth/config'),
    login: (email: string, password: string) =>
      request<{ access_token: string; token_type: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    getMe: () =>
      request<{ id: number; email: string; is_active: boolean; permissions: string[] }>('/auth/me'),
  },
  hierarchy: {
    list: (flat?: boolean) => request<HierarchyNode[]>(flat ? '/hierarchy?flat=true' : '/hierarchy'),
    get: (id: number) => request<HierarchyNode>(`/hierarchy/${id}`),
    create: (data: HierarchyNodeCreateInput) =>
      request<HierarchyNode>('/hierarchy', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<HierarchyNodeCreateInput>) =>
      request<HierarchyNode>(`/hierarchy/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/hierarchy/${id}`, {
        method: 'DELETE',
      }),
  },
  alerts: {
    list: (filters?: { node_id?: number | null; severity?: string; status?: string }) => {
      const params = new URLSearchParams();
      if (filters?.node_id) params.append('node_id', filters.node_id.toString());
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.status) params.append('status', filters.status);
      const query = params.toString();
      return request<any[]>(`/alerts${query ? `?${query}` : ''}`);
    },
    listRules: () => request<any[]>('/alerts/rules'),
    createRule: (data: any) => request<any>('/alerts/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateRule: (id: number, data: any) => request<any>(`/alerts/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteRule: (id: number) => request<void>(`/alerts/rules/${id}`, {
      method: 'DELETE',
    }),
    update: (id: number, data: { status: string }) => request<any>(`/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  },
  dashboard: {
    getSummary: () => request<any>('/dashboard/summary'),
    getTelemetry: (
      sensorIds: string[],
      hours: number = 24,
      granularity?: string,
      startTime?: string,
      endTime?: string
    ) => {
      const params = new URLSearchParams();
      sensorIds.forEach(id => params.append('sensor_ids', id));
      params.append('hours', hours.toString());
      if (granularity) {
        params.append('granularity', granularity);
      }
      if (startTime) {
        params.append('start_time', startTime);
      }
      if (endTime) {
        params.append('end_time', endTime);
      }
      return request<any[]>(`/dashboard/telemetry?${params.toString()}`);
    },
  },
  rootCause: {
    get: (eventId: string) => request<any>(`/root-cause/${eventId}`),
  },
  advisories: {
    list: (filters?: { node_id?: number | null; status?: string; severity?: string }) => {
      const params = new URLSearchParams();
      if (filters?.node_id) params.append('node_id', filters.node_id.toString());
      if (filters?.status) params.append('status', filters.status);
      if (filters?.severity) params.append('severity', filters.severity);
      const queryString = params.toString();
      return request<any[]>(queryString ? `/advisories?${queryString}` : '/advisories');
    },
    update: (id: number, data: any) =>
      request<any>(`/advisories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    uploadImage: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('auth_token');
      return fetch('http://127.0.0.1:8000/api/v1/advisories/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      }).then(res => {
        if (!res.ok) throw new Error("Upload failed");
        return res.json() as Promise<{ url: string }>;
      });
    },
  },
  reports: {
    list: () => request<any[]>('/reports'),
  },
  admin: {
    getStatus: () => request<any>('/admin/status'),
    listUsers: () => request<any[]>('/admin/users'),
    listPermissions: () => request<any[]>('/admin/permissions'),
    updatePermissions: (userId: number, permissions: string[]) =>
      request<any>(`/admin/users/${userId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions }),
      }),
    getUserHierarchy: (userId: number) =>
      request<number[]>(`/admin/users/${userId}/hierarchy`),
    updateUserHierarchy: (userId: number, nodes: number[]) =>
      request<any>(`/admin/users/${userId}/hierarchy`, {
        method: 'PUT',
        body: JSON.stringify({ nodes }),
      }),
  },
};
