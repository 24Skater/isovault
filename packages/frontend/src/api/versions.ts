import type { IsoVersion } from './definitions';

import { request } from './client';

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
