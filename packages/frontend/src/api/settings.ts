const BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export interface AppSetting {
  key: string;
  value: string;
  updatedAt: string;
}

export async function fetchSettings(): Promise<{ data: AppSetting[] }> {
  return request<{ data: AppSetting[] }>('/settings');
}

export async function updateSetting(key: string, value: string): Promise<AppSetting> {
  return request<AppSetting>(`/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}
