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

export interface StorageStats {
  storagePath: string;
  usedBytes: number;
  freeBytes: number | null;
  totalBytes: number | null;
  alertThresholdPercent: number;
}

export interface DashboardStats {
  definitions: number;
  versions: { active: number; archived: number };
  downloads: { running: number; queued: number };
  storage: {
    usedBytes: number;
    freeBytes: number | null;
    totalBytes: number | null;
    alertThresholdPercent: number;
  };
  recentEvents: import('./audit').AuditLogEntry[];
}

export async function fetchStorageStats(): Promise<StorageStats> {
  return request<StorageStats>('/storage/stats');
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return request<DashboardStats>('/stats');
}
