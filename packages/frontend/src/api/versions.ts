import type { IsoVersion } from './definitions';

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

export interface ArchivedVersion extends IsoVersion {
  definitionName: string;
  definitionFamily: string;
}

export interface ArchivedVersionsResponse {
  data: ArchivedVersion[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchArchivedVersions(page = 1): Promise<ArchivedVersionsResponse> {
  return request<ArchivedVersionsResponse>(`/versions?status=archived&page=${page}&limit=50`);
}

export async function activateVersion(id: string): Promise<IsoVersion> {
  return request<IsoVersion>(`/versions/${id}/activate`, { method: 'PATCH' });
}

export async function deleteVersion(id: string): Promise<void> {
  return request<void>(`/versions/${id}`, { method: 'DELETE' });
}
