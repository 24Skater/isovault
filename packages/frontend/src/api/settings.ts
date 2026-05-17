import { request } from './client';

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
