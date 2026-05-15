import { useState, useEffect } from 'react';
import type { IsoVersion, IsoStatus } from '../api/definitions';
import { fetchVersions } from '../api/definitions';
import { formatBytes } from '../utils/format';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_BORDER: Record<IsoStatus, string> = {
  pending:     'var(--color-warning)',
  downloading: 'var(--accent)',
  active:      'var(--color-success)',
  archived:    'var(--border-strong)',
  corrupt:     'var(--color-error)',
  deleted:     'var(--border-strong)',
};

const STATUS_COLOR: Record<IsoStatus, string> = {
  pending:     'var(--color-warning)',
  downloading: 'var(--accent)',
  active:      'var(--color-success)',
  archived:    'var(--text-muted)',
  corrupt:     'var(--color-error)',
  deleted:     'var(--text-muted)',
};

const STATUS_LABEL: Record<IsoStatus, string> = {
  pending:     'Pending',
  downloading: 'Downloading',
  active:      'Active',
  archived:    'Archived',
  corrupt:     'Corrupt',
  deleted:     'Deleted',
};

function StatusBadge({ status }: { status: IsoStatus }) {
  return (
    <span className="badge" style={{
      border: `1px solid ${STATUS_BORDER[status] ?? 'var(--border-strong)'}`,
      color: STATUS_COLOR[status] ?? 'var(--text-muted)',
    }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Version row ──────────────────────────────────────────────────────────────

function VersionRow({ version, isLast }: { version: IsoVersion; isLast: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Timeline stem */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 20 }}>
        <div style={{
          width: 8,
          height: 8,
          marginTop: 4,
          flexShrink: 0,
          background: version.status === 'active' ? 'var(--color-success)' : 'var(--border-default)',
        }} />
        {!isLast && (
          <div style={{ flex: 1, width: 1, marginTop: 4, background: 'var(--border-subtle)' }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                {version.versionString}
              </span>
              <StatusBadge status={version.status} />
              {version.checksumVerified && (
                <span className="badge" style={{
                  border: '1px solid var(--color-success)',
                  color: 'var(--color-success)',
                }}>
                  ✓ verified
                </span>
              )}
            </div>
            <div style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 11,
              marginTop: 3,
              color: 'var(--text-muted)',
            }}>
              {version.filename}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
              {formatBytes(version.fileSizeBytes)}
            </div>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, marginTop: 2, color: 'var(--text-muted)' }}>
              {formatDate(version.downloadCompletedAt ?? version.createdAt)}
            </div>
          </div>
        </div>
        {version.notes && (
          <p style={{ fontSize: 12, marginTop: 6, color: 'var(--text-secondary)' }}>
            {version.notes}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Timeline component ───────────────────────────────────────────────────────

const LIMIT = 10;

const btnStyle: React.CSSProperties = {
  padding: '4px 12px',
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-default)',
  fontFamily: 'ui-monospace, monospace',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  cursor: 'pointer',
};

interface Props {
  definitionId: string;
}

export default function VersionTimeline({ definitionId }: Props) {
  const [versions, setVersions] = useState<IsoVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchVersions(definitionId, { page, limit: LIMIT })
      .then((res) => {
        setVersions(res.data);
        setTotal(res.total);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load versions.');
      })
      .finally(() => setLoading(false));
  }, [definitionId, page]);

  if (loading) {
    return (
      <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, padding: '16px 0', color: 'var(--text-muted)' }}>
        Loading versions…
      </p>
    );
  }

  if (error) {
    return (
      <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, padding: '16px 0', color: 'var(--color-error)' }}>
        {error}
      </p>
    );
  }

  if (versions.length === 0) {
    return (
      <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, padding: '16px 0', color: 'var(--text-muted)' }}>
        No versions downloaded yet. Trigger a download to see them here.
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div>
      <p style={{
        fontFamily: 'ui-monospace, monospace',
        fontSize: 10,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 16,
      }}>
        {total} version{total !== 1 ? 's' : ''}
      </p>

      <div>
        {versions.map((v, i) => (
          <VersionRow key={v.id} version={v} isLast={i === versions.length - 1} />
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{ ...btnStyle, opacity: page <= 1 ? 0.4 : 1 }}
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{ ...btnStyle, opacity: page >= totalPages ? 0.4 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
