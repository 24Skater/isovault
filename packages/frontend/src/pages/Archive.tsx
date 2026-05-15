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

const btnStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: 'transparent',
  border: '1px solid var(--border-default)',
  color: 'var(--text-secondary)',
  fontFamily: 'ui-monospace, monospace',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  cursor: 'pointer',
};

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
      <h1 style={{
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: 'var(--text-secondary)',
        marginBottom: 4,
      }}>
        Archive
        <span style={{ marginLeft: 12, color: 'var(--text-muted)', fontWeight: 400 }}>{total}</span>
      </h1>
      <div className="page-rule" />

      {error && (
        <div style={{
          background: 'var(--color-error-subtle)',
          border: '1px solid var(--color-error)',
          color: 'var(--color-error)',
          padding: '8px 12px',
          marginBottom: 16,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {error}
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}>×</button>
        </div>
      )}

      {loading ? (
        <p style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--text-muted)', fontSize: 11 }}>Loading…</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--text-muted)', fontSize: 11 }}>No archived versions.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(grouped).map(([defId, group]) => (
            <div key={defId} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
              <div style={{
                padding: '8px 16px',
                borderBottom: '1px solid var(--border-default)',
                background: 'var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>{group.name}</span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-muted)' }}>{group.family}</span>
              </div>

              {group.items.map((v) => (
                <div key={v.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                }}>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'var(--text-primary)', minWidth: 80 }}>
                    {v.versionString}
                  </span>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-muted)' }}>
                    {v.id.slice(0, 8)}…
                  </span>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--text-secondary)' }}>
                    {formatBytes(v.fileSizeBytes)}
                  </span>
                  {v.archivedAt && (
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-muted)' }}>
                      {new Date(v.archivedAt).toLocaleDateString()}
                    </span>
                  )}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => void handleActivate(v.id)}
                      disabled={actionInFlight === v.id}
                      style={{ ...btnStyle, opacity: actionInFlight === v.id ? 0.5 : 1 }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => void handleDelete(v.id)}
                      disabled={actionInFlight === v.id}
                      style={{ ...btnStyle, color: 'var(--color-error)', borderColor: 'var(--color-error)', opacity: actionInFlight === v.id ? 0.5 : 1 }}
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
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14, alignItems: 'center' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            style={{ ...btnStyle, opacity: page === 1 ? 0.4 : 1 }}>
            Prev
          </button>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ ...btnStyle, opacity: page === totalPages ? 0.4 : 1 }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
