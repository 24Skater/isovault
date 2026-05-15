import { useState, useCallback, useEffect } from 'react';
import {
  fetchDownloadJobs,
  cancelDownload,
  type DownloadJob,
  type DownloadJobStatus,
  type WsDownloadProgressEvent,
} from '../api/downloads';
import { useDownloadProgress, type ProgressMap } from '../hooks/useDownloadProgress';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatSpeed(bps: number | null): string {
  if (bps === null || bps <= 0) return '—';
  return `${formatBytes(bps)}/s`;
}

function formatEta(sec: number | null): string {
  if (sec === null || sec < 0) return '—';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<DownloadJobStatus, { bg: string; color: string }> = {
  queued:    { bg: 'var(--color-warning-subtle)',  color: 'var(--color-warning)'  },
  running:   { bg: 'var(--accent-subtle)',         color: 'var(--accent)'         },
  paused:    { bg: 'var(--bg-elevated)',           color: 'var(--text-secondary)' },
  completed: { bg: 'var(--color-success-subtle)',  color: 'var(--color-success)'  },
  failed:    { bg: 'var(--color-error-subtle)',    color: 'var(--color-error)'    },
  cancelled: { bg: 'var(--bg-elevated)',           color: 'var(--text-muted)'     },
};

function StatusBadge({ status }: { status: DownloadJobStatus }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.queued;
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.color,
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: 'var(--radius-sm)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ percent, indeterminate }: { percent: number | null; indeterminate?: boolean }) {
  return (
    <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden', minWidth: 120 }}>
      <div
        className={indeterminate ? 'animate-pulse-slow progress-fill' : 'progress-fill'}
        style={{
          height: '100%',
          background: 'var(--accent)',
          borderRadius: 3,
          width: percent !== null ? `${Math.min(percent, 100)}%` : '100%',
          opacity: indeterminate ? 0.5 : 1,
        }}
      />
    </div>
  );
}

// ─── Active job row ───────────────────────────────────────────────────────────

function ActiveRow({
  job,
  progress,
  onCancel,
}: {
  job: DownloadJob;
  progress: WsDownloadProgressEvent | undefined;
  onCancel: (id: string) => void;
}) {
  const bytes = progress?.bytesDownloaded ?? job.bytesDownloaded;
  const total = progress?.bytesTotal ?? job.bytesTotal;
  const percent = progress?.percent ?? (total ? (bytes / total) * 100 : null);

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <StatusBadge status={job.status} />
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
          {job.id.slice(0, 8)}…
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: 12 }}>
          {formatBytes(bytes)}{total ? ` / ${formatBytes(total)}` : ''}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {formatSpeed(progress?.speedBytesPerSec ?? null)}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          ETA {formatEta(progress?.etaSeconds ?? null)}
        </span>
        <button
          onClick={() => onCancel(job.id)}
          style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '3px 10px', fontSize: 12, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
      <ProgressBar percent={percent} indeterminate={total === null} />
    </div>
  );
}

// ─── Generic job row ──────────────────────────────────────────────────────────

function JobRow({ job, showCancel, onCancel }: { job: DownloadJob; showCancel: boolean; onCancel: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
      <StatusBadge status={job.status} />
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
        {job.id.slice(0, 8)}…
      </span>
      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
        attempt {job.attemptCount}/{job.maxAttempts}
      </span>
      {job.bytesDownloaded > 0 && (
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
          {formatBytes(job.bytesDownloaded)}{job.bytesTotal ? ` / ${formatBytes(job.bytesTotal)}` : ''}
        </span>
      )}
      {job.errorMessage && (
        <span
          style={{ color: 'var(--color-error)', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={job.errorMessage}
        >
          {job.errorMessage}
        </span>
      )}
      {showCancel && (
        <button
          onClick={() => onCancel(job.id)}
          style={{ marginLeft: 'auto', background: 'var(--color-error-subtle)', color: 'var(--color-error)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '3px 10px', fontSize: 12, cursor: 'pointer' }}
        >
          Cancel
        </button>
      )}
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = 'active' | 'queued' | 'history';

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'active', label: 'Active' },
    { id: 'queued', label: 'Queued' },
    { id: 'history', label: 'History' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-subtle)' }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: active === t.id ? 600 : 400,
            color: active === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            borderBottom: active === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Downloads() {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [tab, setTab] = useState<Tab>('active');
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetchDownloadJobs({ limit: 100 });
      setJobs(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    }
  }, []);

  useEffect(() => {
    void loadJobs();
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  const { connected } = useDownloadProgress({
    onProgress: useCallback((event: WsDownloadProgressEvent) => {
      setProgressMap((prev) => ({ ...prev, [event.jobId]: event }));
    }, []),
    onCompleted: useCallback(() => { void loadJobs(); }, [loadJobs]),
    onFailed: useCallback(() => { void loadJobs(); }, [loadJobs]),
  });

  const handleCancel = useCallback(async (id: string) => {
    try {
      await cancelDownload(id);
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    }
  }, [loadJobs]);

  const activeJobs = jobs.filter((j) => j.status === 'running');
  const queuedJobs = jobs.filter((j) => j.status === 'queued');
  const historyJobs = jobs.filter((j) => ['completed', 'failed', 'cancelled'].includes(j.status));

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Downloads</h1>
        <span
          style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? 'var(--color-success)' : 'var(--color-warning)', display: 'inline-block' }}
          title={connected ? 'Live updates connected' : 'Reconnecting…'}
        />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {connected ? 'live' : 'connecting…'}
        </span>
      </div>

      {error && (
        <div style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 12, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 600 }}>×</button>
        </div>
      )}

      <TabBar active={tab} onChange={setTab} />

      <div style={{ marginTop: 16 }}>
        {tab === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeJobs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active downloads.</p>
            ) : (
              activeJobs.map((job) => (
                <ActiveRow key={job.id} job={job} progress={progressMap[job.id]} onCancel={handleCancel} />
              ))
            )}
          </div>
        )}

        {tab === 'queued' && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {queuedJobs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>No queued downloads.</p>
            ) : (
              queuedJobs.map((job) => (
                <JobRow key={job.id} job={job} showCancel onCancel={handleCancel} />
              ))
            )}
          </div>
        )}

        {tab === 'history' && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {historyJobs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>No download history.</p>
            ) : (
              historyJobs.map((job) => (
                <JobRow key={job.id} job={job} showCancel={false} onCancel={handleCancel} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
