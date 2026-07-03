import type { HierarchyNode, HierarchyNodeCreateInput } from '../types/hierarchy';

const BASE_URL = 'http://127.0.0.1:8000/api/v1';

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
  },
  rootCause: {
    get: (eventId: string) => request<any>(`/root-cause/${eventId}`),
  },
  advisories: {
    list: () => request<any[]>('/advisories'),
  },
  reports: {
    list: () => request<any[]>('/reports'),
  },
  admin: {
    getStatus: () => request<any>('/admin/status'),
  },
};
