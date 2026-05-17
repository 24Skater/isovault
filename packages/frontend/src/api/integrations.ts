import { request } from './client';

export interface IntegrationToken {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

export interface CreatedToken extends IntegrationToken {
  token: string; // plaintext — shown only once
}

export async function listIntegrationTokens(): Promise<IntegrationToken[]> {
  return request<IntegrationToken[]>('/integrations/tokens');
}

export async function createIntegrationToken(
  name: string,
  description?: string,
): Promise<CreatedToken> {
  return request<CreatedToken>('/integrations/tokens', {
    method: 'POST',
    body: JSON.stringify({ name, description: description || null }),
  });
}

export async function revokeIntegrationToken(id: string): Promise<void> {
  return request<void>(`/integrations/tokens/${id}/revoke`, { method: 'PATCH' });
}

export async function deleteIntegrationToken(id: string): Promise<void> {
  return request<void>(`/integrations/tokens/${id}`, { method: 'DELETE' });
}
