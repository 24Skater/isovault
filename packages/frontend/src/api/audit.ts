import { request } from './client';

export type AuditSeverity = 'info' | 'warn' | 'error' | 'critical';

export interface AuditLogEntry {
  id: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  severity: AuditSeverity;
  createdAt: string;
}

export interface AuditListParams {
  entityType?: string;
  entityId?: string;
  severity?: AuditSeverity;
  eventType?: string;
  page?: number;
  limit?: number;
}

export interface AuditListResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchAuditLog(params: AuditListParams = {}): Promise<AuditListResponse> {
  const qs = new URLSearchParams();
  if (params.entityType) qs.set('entityType', params.entityType);
  if (params.entityId) qs.set('entityId', params.entityId);
  if (params.severity) qs.set('severity', params.severity);
  if (params.eventType) qs.set('eventType', params.eventType);
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const q = qs.toString() ? `?${qs.toString()}` : '';
  return request<AuditListResponse>(`/audit${q}`);
}
