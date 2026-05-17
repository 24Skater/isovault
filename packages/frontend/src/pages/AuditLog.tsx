import { useState, useCallback, useEffect } from 'react';
import { fetchAuditLog, type AuditLogEntry, type AuditSeverity } from '../api/audit';

type AuditSeverityFilter = AuditSeverity | '';

// ─── Severity badge ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  const bgMap: Record<AuditSeverity, string> = {
    info:     'var(--bg-elevated)',
    warn:     'var(--color-warning-subtle)',
    error:    'var(--color-danger-subtle)',
    critical: 'var(--color-danger-subtle)',
  };
  const colorMap: Record<AuditSeverity, string> = {
    info:     'var(--text-muted)',
    warn:     'var(--color-warning)',
    error:    'var(--color-danger)',
    critical: 'var(--color-danger)',
  };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 9999,
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 500,
      background: bgMap[severity],
      color: colorMap[severity],
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
  height: 34,
  padding: '0 10px',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  outline: 'none',
};

const btnStyle: React.CSSProperties = {
  padding: '5px 12px',
  background: 'transparent',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 500,
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
    <div style={{ padding: '28px 28px', maxWidth: 1100 }}>
      <h1 style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--text-primary)',
        letterSpacing: '-0.02em',
        marginBottom: 16,
      }}>
        Audit Log
        <span style={{ marginLeft: 10, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>
          {total}
        </span>
      </h1>

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
          background: 'var(--color-danger-subtle)',
          border: '1px solid var(--color-danger)',
          color: 'var(--color-danger)',
          padding: '8px 12px',
          marginBottom: 12,
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          borderRadius: 'var(--radius-md)',
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
              {['Severity', 'Event Type', 'Entity', 'Timestamp'].map((h) => (
                <th key={h} style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)' }}>
                  Loading…
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)' }}>
                  No events found.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <SeverityBadge severity={e.severity} />
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)' }}>
                    {e.eventType}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                    {e.entityType ? `${e.entityType}${e.entityId ? ` / ${e.entityId.slice(0, 8)}…` : ''}` : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
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
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>
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
