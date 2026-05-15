import { useState, useCallback, useEffect } from 'react';
import type { IsoVersion } from '../api/definitions';

// ─── Shared request helper ────────────────────────────────────────────────────

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

interface ArchivedVersion extends IsoVersion {
  definitionName: string;
  definitionFamily: string;
}

interface VersionsResponse {
  data: ArchivedVersion[];
  total: number;
  page: number;
  limit: number;
}

async function fetchArchivedVersions(page = 1): Promise<VersionsResponse> {
  return request<VersionsResponse>(`/versions?status=archived&page=${page}&limit=50`);
}

async function activateVersion(id: string): Promise<IsoVersion> {
  return request<IsoVersion>(`/versions/${id}/activate`, { method: 'PATCH' });
}

async function deleteVersion(id: string): Promise<void> {
  return request<void>(`/versions/${id}`, { method: 'DELETE' });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(n: number | null): string {
  if (n === null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Archive() {
  const [versions, setVersions] = useState<ArchivedVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchArchivedVersions(p);
      setVersions(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load archive');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(page); }, [load, page]);

  const handleActivate = useCallback(async (id: string) => {
    setActionInFlight(id);
    try {
      await activateVersion(id);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore version');
    } finally {
      setActionInFlight(null);
    }
  }, [load, page]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Permanently delete this version and its file? This cannot be undone.')) return;
    setActionInFlight(id);
    try {
      await deleteVersion(id);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete version');
    } finally {
      setActionInFlight(null);
    }
  }, [load, page]);

  const LIMIT = 50;
  const totalPages = Math.ceil(total / LIMIT);

  // Group by definition
  const grouped = versions.reduce<Record<string, { name: string; family: string; items: ArchivedVersion[] }>>(
    (acc, v) => {
      if (!acc[v.definitionId]) {
        acc[v.definitionId] = { name: v.definitionName, family: v.definitionFamily, items: [] };
      }
      acc[v.definitionId].items.push(v);
      return acc;
    },
    {},
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Archive</h1>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{total} archived version{total !== 1 ? 's' : ''}</span>
      </div>

      {error && (
        <div style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: 13 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 12, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 600 }}>×</button>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No archived versions.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(grouped).map(([defId, group]) => (
            <div key={defId} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{group.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{group.family}</span>
              </div>

              {group.items.map((v) => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)', minWidth: 80 }}>
                    {v.versionString}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {v.id.slice(0, 8)}…
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {formatBytes(v.fileSizeBytes)}
                  </span>
                  {v.archivedAt && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      archived {new Date(v.archivedAt).toLocaleDateString()}
                    </span>
                  )}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => void handleActivate(v.id)}
                      disabled={actionInFlight === v.id}
                      style={{ padding: '3px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'pointer' }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => void handleDelete(v.id)}
                      disabled={actionInFlight === v.id}
                      style={{ padding: '3px 10px', fontSize: 12, borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-error-subtle)', color: 'var(--color-error)', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, alignItems: 'center' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '4px 12px', fontSize: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
            Prev
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '4px 12px', fontSize: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
