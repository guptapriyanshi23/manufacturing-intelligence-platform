import type { HierarchyNode, HierarchyNodeCreateInput } from '../types/hierarchy';

const BASE_URL = `http://127.0.0.1:8000/api/v1`;

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
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
    list: () => request<any[]>('/alerts'),
  },
  dashboard: {
    getSummary: () => request<any>('/dashboard/summary'),
    getTelemetry: (sensorIds: string[], hours: number = 24) => {
      const params = new URLSearchParams();
      sensorIds.forEach(id => params.append('sensor_ids', id));
      params.append('hours', hours.toString());
      return request<any[]>(`/dashboard/telemetry?${params.toString()}`);
    },
  },
  rootCause: {
    get: (eventId: string) => request<any>(`/root-cause/${eventId}`),
  },
  advisories: {
    list: () => request<any[]>('/advisories'),
    update: (id: number, data: any) =>
      request<any>(`/advisories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    uploadImage: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return fetch('http://127.0.0.1:8000/api/v1/advisories/upload', {
        method: 'POST',
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
  },
};
