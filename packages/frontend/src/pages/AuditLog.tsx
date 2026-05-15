import { useState, useCallback, useEffect } from 'react';
import { fetchAuditLog, type AuditLogEntry, type AuditSeverity } from '../api/audit';

type AuditSeverityFilter = AuditSeverity | '';

// ─── Severity badge ───────────────────────────────────────────────────────────

const SEV_BORDER: Record<AuditSeverity, string> = {
  info:     'var(--border-strong)',
  warn:     'var(--color-warning)',
  error:    'var(--color-error)',
  critical: 'var(--color-error)',
};

const SEV_COLOR: Record<AuditSeverity, string> = {
  info:     'var(--text-muted)',
  warn:     'var(--color-warning)',
  error:    'var(--color-error)',
  critical: 'var(--color-error)',
};

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  return (
    <span className="badge" style={{
      border: `1px solid ${SEV_BORDER[severity] ?? 'var(--border-strong)'}`,
      color: SEV_COLOR[severity] ?? 'var(--text-muted)',
    }}>
      {severity}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

const inputStyle: React.CSSProperties = {
  fontSize: 11,
  padding: '6px 10px',
  border: '1px solid var(--border-default)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontFamily: 'ui-monospace, monospace',
  outline: 'none',
};

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

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<AuditSeverityFilter>('');
  const [filterEventType, setFilterEventType] = useState('');

  const LIMIT = 50;

  const load = useCallback(async (p: number, sev: string, et: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuditLog({
        page: p,
        limit: LIMIT,
        severity: (sev || undefined) as AuditSeverity | undefined,
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

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100 }}>
      <h1 style={{
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: 'var(--text-secondary)',
        marginBottom: 4,
      }}>
        Audit Log
        <span style={{ marginLeft: 12, color: 'var(--text-muted)', fontWeight: 400 }}>{total}</span>
      </h1>
      <div className="page-rule" />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={filterSeverity}
          onChange={(e) => { setFilterSeverity(e.target.value as AuditSeverityFilter); setPage(1); }}
          style={inputStyle}
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
          style={{ ...inputStyle, minWidth: 200 }}
        />
      </div>

      {error && (
        <div style={{
          background: 'var(--color-error-subtle)',
          border: '1px solid var(--color-error)',
          color: 'var(--color-error)',
          padding: '8px 12px',
          marginBottom: 12,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
              {['Severity', 'Event Type', 'Entity', 'Timestamp'].map((h) => (
                <th key={h} style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontFamily: 'ui-monospace, monospace',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                  Loading…
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                  No events found.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <SeverityBadge severity={e.severity} />
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--text-primary)' }}>
                    {e.eventType}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--text-secondary)' }}>
                    {e.entityType ? `${e.entityType}${e.entityId ? ` / ${e.entityId.slice(0, 8)}…` : ''}` : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
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
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 12, alignItems: 'center' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            style={{ ...btnStyle, opacity: page === 1 ? 0.4 : 1 }}>
            Prev
          </button>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-muted)' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ ...btnStyle, opacity: page === totalPages ? 0.4 : 1 }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
