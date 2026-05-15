import type { IsoDefinition } from './definitions';

// ─── API helpers ──────────────────────────────────────────────────────────────

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

// ─── Watchers API ─────────────────────────────────────────────────────────────

export async function fetchWatchers(): Promise<IsoDefinition[]> {
  return request<IsoDefinition[]>('/watchers');
}

export async function triggerWatcher(definitionId: string): Promise<void> {
  return request<void>(`/definitions/${definitionId}/watch/trigger`, { method: 'POST' });
}

