import { request } from './client';

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
