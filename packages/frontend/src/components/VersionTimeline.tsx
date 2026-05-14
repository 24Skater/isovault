import { useState, useEffect } from 'react';
import type { IsoVersion, IsoStatus } from '../api/definitions';
import { fetchVersions } from '../api/definitions';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<IsoStatus, { bg: string; color: string; label: string }> = {
  pending: { bg: 'var(--color-warning-subtle)', color: 'var(--color-warning)', label: 'Pending' },
  downloading: { bg: 'var(--accent-subtle)', color: 'var(--accent)', label: 'Downloading' },
  active: { bg: 'var(--color-success-subtle)', color: 'var(--color-success)', label: 'Active' },
  archived: { bg: 'var(--bg-hover)', color: 'var(--text-muted)', label: 'Archived' },
  corrupt: { bg: 'var(--color-error-subtle)', color: 'var(--color-error)', label: 'Corrupt' },
  deleted: { bg: 'var(--bg-hover)', color: 'var(--text-muted)', label: 'Deleted' },
};

function StatusBadge({ status }: { status: IsoStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── File size helper ─────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Version row ──────────────────────────────────────────────────────────────

function VersionRow({ version, isLast }: { version: IsoVersion; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      {/* Timeline stem */}
      <div className="flex flex-col items-center flex-shrink-0 w-6">
        <div
          className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
          style={{
            background:
              version.status === 'active' ? 'var(--color-success)' : 'var(--border-default)',
          }}
        />
        {!isLast && (
          <div
            className="flex-1 w-px mt-1"
            style={{ background: 'var(--border-subtle)' }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {version.versionString}
              </span>
              <StatusBadge status={version.status} />
              {version.checksumVerified && (
                <span
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success)' }}
                >
                  ✓ verified
                </span>
              )}
            </div>
            <div
              className="text-xs mt-1 font-mono"
              style={{ color: 'var(--text-muted)' }}
            >
              {version.filename}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatBytes(version.fileSizeBytes)}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {formatDate(version.downloadCompletedAt ?? version.createdAt)}
            </div>
          </div>
        </div>
        {version.notes && (
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            {version.notes}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Timeline component ───────────────────────────────────────────────────────

interface Props {
  definitionId: string;
}

export default function VersionTimeline({ definitionId }: Props) {
  const [versions, setVersions] = useState<IsoVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const LIMIT = 10;

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
      <p className="text-sm py-4" style={{ color: 'var(--text-muted)' }}>
        Loading versions…
      </p>
    );
  }

  if (error) {
    return (
      <p
        className="text-sm py-4"
        style={{ color: 'var(--color-error)' }}
      >
        {error}
      </p>
    );
  }

  if (versions.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: 'var(--text-muted)' }}>
        No versions downloaded yet. Trigger a download to see them here.
      </p>
    );
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        {total} version{total !== 1 ? 's' : ''}
      </p>

      <div>
        {versions.map((v, i) => (
          <VersionRow key={v.id} version={v} isLast={i === versions.length - 1} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-md text-xs disabled:opacity-40"
              style={{
                background: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-md text-xs disabled:opacity-40"
              style={{
                background: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
