import { APIRequestContext, request } from '@playwright/test';
import { authHeaders } from './auth';

const BASE_URL = 'http://localhost:3721';

export async function newApiContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: authHeaders(),
  });
}

// ── Definitions ───────────────────────────────────────────────────────────────

export interface SeedDefinition {
  id: string;
  name: string;
  family: string;
  architecture: string;
}

export async function createDefinition(
  ctx: APIRequestContext,
  overrides: Partial<{ name: string; family: string; architecture: string }> = {},
): Promise<SeedDefinition> {
  const res = await ctx.post('/api/definitions', {
    data: {
      name: overrides.name ?? `E2E Definition ${Date.now()}`,
      family: overrides.family ?? 'e2e-test',
      architecture: overrides.architecture ?? 'x86_64',
      checksumAlgo: 'sha256',
      retentionCount: 3,
      retentionBehavior: 'archive',
      watchEnabled: false,
    },
  });
  if (!res.ok()) throw new Error(`createDefinition failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<SeedDefinition>;
}

export async function deleteDefinition(ctx: APIRequestContext, id: string): Promise<void> {
  await ctx.delete(`/api/definitions/${id}`);
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface AppSetting {
  key: string;
  value: string;
}

export async function getSettings(ctx: APIRequestContext): Promise<AppSetting[]> {
  const res = await ctx.get('/api/settings');
  if (!res.ok()) throw new Error(`getSettings failed: ${res.status()}`);
  const body = await res.json() as { data: AppSetting[] };
  return body.data;
}

export async function setSetting(
  ctx: APIRequestContext,
  key: string,
  value: string,
): Promise<AppSetting> {
  const res = await ctx.put(`/api/settings/${key}`, { data: { value } });
  if (!res.ok()) throw new Error(`setSetting failed: ${res.status()}`);
  return res.json() as Promise<AppSetting>;
}
