import { useState, useCallback, useEffect } from 'react';
import { fetchAuditLog, type AuditLogEntry, type AuditSeverity } from '../api/audit';

// ─── Severity badge ───────────────────────────────────────────────────────────

const SEV_COLORS: Record<AuditSeverity, { bg: string; color: string }> = {
  info:     { bg: 'var(--bg-elevated)',          color: 'var(--text-secondary)' },
  warn:     { bg: 'var(--color-warning-subtle)', color: 'var(--color-warning)'  },
  error:    { bg: 'var(--color-error-subtle)',   color: 'var(--color-error)'    },
  critical: { bg: 'var(--color-error)',          color: '#fff'                  },
};

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  const c = SEV_COLORS[severity] ?? SEV_COLORS.info;
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: 'var(--radius-sm)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
      }}
    >
      {severity}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterEventType, setFilterEventType] = useState('');

  const LIMIT = 50;

  const load = useCallback(async (p: number, sev: string, et: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuditLog({
        page: p,
        limit: LIMIT,
        severity: sev as AuditSeverity || undefined,
        eventType: et || undefined,
      });
      setEntries(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page, filterSeverity, filterEventType);
  }, [load, page, filterSeverity, filterEventType]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
        Audit Log
      </h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={filterSeverity}
          onChange={(e) => { setFilterSeverity(e.target.value); setPage(1); }}
          style={{ fontSize: 13, padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          <option value="">All severities</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>

        <input
          type="text"
          placeholder="Filter by event type…"
          value={filterEventType}
          onChange={(e) => { setFilterEventType(e.target.value); setPage(1); }}
          style={{ fontSize: 13, padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', minWidth: 200 }}
        />

        <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
          {total} event{total !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 12, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
              {['Severity', 'Event Type', 'Entity', 'Timestamp'].map((h) => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading…
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No events found.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <SeverityBadge severity={e.severity} />
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {e.eventType}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                    {e.entityType ? `${e.entityType}${e.entityId ? ` / ${e.entityId.slice(0, 8)}…` : ''}` : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                    {fmtDate(e.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12, alignItems: 'center' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '4px 12px', fontSize: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}
          >
            Prev
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: '4px 12px', fontSize: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
