import type { IsoDefinition } from './definitions';

// ─── API helpers ──────────────────────────────────────────────────────────────

import { request } from './client';

// ─── Watchers API ─────────────────────────────────────────────────────────────

export async function fetchWatchers(): Promise<IsoDefinition[]> {
  return request<IsoDefinition[]>('/watchers');
}

export async function triggerWatcher(definitionId: string): Promise<void> {
  return request<void>(`/definitions/${definitionId}/watch/trigger`, { method: 'POST' });
}

