// ─── Shared types (mirrored from backend) ─────────────────────────────────────

export type IsoStatus = 'pending' | 'downloading' | 'active' | 'archived' | 'corrupt' | 'deleted';
export type ChecksumAlgorithm = 'sha256' | 'sha512' | 'md5';
export type RetentionBehavior = 'archive' | 'delete';
export type WatchStrategy = 'rss' | 'html_scrape' | 'json_api' | 'checksum' | 'filename';

export interface IsoDefinition {
  id: string;
  name: string;
  family: string;
  architecture: string;
  description: string | null;
  tags: string[];
  sourceUrl: string | null;
  checksumUrl: string | null;
  checksumAlgo: ChecksumAlgorithm;
  retentionCount: number;
  retentionBehavior: RetentionBehavior;
  watchEnabled: boolean;
  watchStrategy: WatchStrategy | null;
  watchConfig: Record<string, unknown> | null;
  watchIntervalMinutes: number;
  watchLastCheckedAt: string | null;
  watchLastVersionFound: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IsoVersion {
  id: string;
  definitionId: string;
  versionString: string;
  releaseDate: string | null;
  filename: string;
  filePath: string;
  fileSizeBytes: number | null;
  checksum: string | null;
  checksumVerified: boolean;
  status: IsoStatus;
  sourceUrl: string;
  downloadStartedAt: string | null;
  downloadCompletedAt: string | null;
  archivedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateDefinitionDto {
  name: string;
  family: string;
  architecture: string;
  description?: string | null;
  tags?: string[];
  sourceUrl?: string | null;
  checksumUrl?: string | null;
  checksumAlgo?: ChecksumAlgorithm;
  retentionCount?: number;
  retentionBehavior?: RetentionBehavior;
  watchEnabled?: boolean;
  watchStrategy?: WatchStrategy | null;
  watchIntervalMinutes?: number;
}

export type UpdateDefinitionDto = Partial<CreateDefinitionDto>;

// ─── API helpers ──────────────────────────────────────────────────────────────

const BASE = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
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

// ─── Definitions API ──────────────────────────────────────────────────────────

export interface ListDefinitionsParams {
  family?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function fetchDefinitions(
  params: ListDefinitionsParams = {},
): Promise<PaginatedResponse<IsoDefinition>> {
  const qs = new URLSearchParams();
  if (params.family) qs.set('family', params.family);
  if (params.search) qs.set('search', params.search);
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const q = qs.toString() ? `?${qs.toString()}` : '';
  return request<PaginatedResponse<IsoDefinition>>(`/definitions${q}`);
}

export async function fetchDefinition(id: string): Promise<IsoDefinition> {
  return request<IsoDefinition>(`/definitions/${id}`);
}

export async function createDefinition(dto: CreateDefinitionDto): Promise<IsoDefinition> {
  return request<IsoDefinition>('/definitions', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateDefinition(
  id: string,
  dto: UpdateDefinitionDto,
): Promise<IsoDefinition> {
  return request<IsoDefinition>(`/definitions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export async function deleteDefinition(id: string): Promise<void> {
  return request<void>(`/definitions/${id}`, { method: 'DELETE' });
}

// ─── Versions API ─────────────────────────────────────────────────────────────

export async function fetchVersions(
  definitionId: string,
  params: { page?: number; limit?: number } = {},
): Promise<PaginatedResponse<IsoVersion>> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const q = qs.toString() ? `?${qs.toString()}` : '';
  return request<PaginatedResponse<IsoVersion>>(`/definitions/${definitionId}/versions${q}`);
}
