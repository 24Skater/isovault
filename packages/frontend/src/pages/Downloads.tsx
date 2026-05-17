import React, { useState, useCallback, useEffect } from 'react';
import {
  fetchDownloadJobs,
  cancelDownload,
  type DownloadJob,
  type DownloadJobStatus,
  type WsDownloadProgressEvent,
} from '../api/downloads';
import { useDownloadProgress, type ProgressMap } from '../hooks/useDownloadProgress';
import { formatBytes } from '../utils/format';

const cancelBtnStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--color-danger)',
  border: '1px solid rgba(239,68,68,0.4)',
  borderRadius: 'var(--radius-md)',
  padding: '4px 10px',
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

function formatSpeed(bps: number | null): string {
  if (bps === null || bps <= 0) return '—';
  return `${formatBytes(bps)}/s`;
}

function formatEta(sec: number | null): string {
  if (sec === null || sec < 0) return '—';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.floor(sec % 60)}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DownloadJobStatus }) {
  const bg: Record<DownloadJobStatus, string> = {
    queued:    'var(--color-warning-subtle)',
    running:   'var(--accent-subtle)',
    paused:    'var(--bg-elevated)',
    completed: 'var(--color-success-subtle)',
    failed:    'var(--color-danger-subtle)',
    cancelled: 'var(--bg-elevated)',
  };
  const color: Record<DownloadJobStatus, string> = {
    queued:    'var(--color-warning)',
    running:   'var(--accent)',
    paused:    'var(--text-muted)',
    completed: 'var(--color-success)',
    failed:    'var(--color-danger)',
    cancelled: 'var(--text-muted)',
  };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 9999,
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 500,
      background: bg[status],
      color: color[status],
    }}>
      {status}
    </span>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ percent, indeterminate }: { percent: number | null; indeterminate?: boolean }) {
  return (
    <div style={{ height: 4, background: 'var(--bg-elevated)', overflow: 'hidden', borderRadius: 2, minWidth: 120 }}>
      <div
        className={indeterminate ? 'animate-pulse-slow progress-fill' : 'progress-fill'}
        style={{
          height: '100%',
          background: 'var(--accent)',
          width: percent !== null ? `${Math.min(percent, 100)}%` : '100%',
          opacity: indeterminate ? 0.5 : 1,
          borderRadius: 2,
        }}
      />
    </div>
  );
}

// ─── Active job row ───────────────────────────────────────────────────────────

function ActiveRow({ job, progress, onCancel }: {
  job: DownloadJob;
  progress: WsDownloadProgressEvent | undefined;
  onCancel: (id: string) => void;
}) {
  const bytes = progress?.bytesDownloaded ?? job.bytesDownloaded;
  const total = progress?.bytesTotal ?? job.bytesTotal;
  const percent = progress?.percent ?? (total ? (bytes / total) * 100 : null);

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderLeft: '2px solid var(--accent)',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <StatusBadge status={job.status} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          {job.id.slice(0, 8)}…
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: 11 }}>
          {formatBytes(bytes)}{total ? ` / ${formatBytes(total)}` : ''}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 11 }}>
          {formatSpeed(progress?.speedBytesPerSec ?? null)}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 11 }}>
          eta {formatEta(progress?.etaSeconds ?? null)}
        </span>
        <button onClick={() => onCancel(job.id)} style={cancelBtnStyle}>
          Cancel
        </button>
      </div>
      <ProgressBar percent={percent} indeterminate={total === null} />
    </div>
  );
}

// ─── Generic job row ──────────────────────────────────────────────────────────

function JobRow({ job, showCancel, onCancel }: {
  job: DownloadJob;
  showCancel: boolean;
  onCancel: (id: string) => void;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 16px',
      borderBottom: '1px solid var(--border-subtle)',
      flexWrap: 'wrap',
    }}>
      <StatusBadge status={job.status} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
        {job.id.slice(0, 8)}…
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: 11 }}>
        attempt {job.attemptCount}/{job.maxAttempts}
      </span>
      {job.bytesDownloaded > 0 && (
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: 11 }}>
          {formatBytes(job.bytesDownloaded)}{job.bytesTotal ? ` / ${formatBytes(job.bytesTotal)}` : ''}
        </span>
      )}
      {job.errorMessage && (
        <span
          style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-mono)', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={job.errorMessage}
        >
          {job.errorMessage}
        </span>
      )}
      {showCancel && (
        <button
          onClick={() => onCancel(job.id)}
          style={{ ...cancelBtnStyle, marginLeft: 'auto' }}
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
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)' }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '8px 16px',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: active === t.id ? 500 : 400,
            color: active === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            borderBottom: active === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1,
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
  const queuedJobs = jobs.filter((j) => j.status === 'queued' || j.status === 'paused');
  const historyJobs = jobs.filter((j) => ['completed', 'failed', 'cancelled'].includes(j.status));

  return (
    <div style={{ padding: '28px 28px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          Downloads
        </h1>
        <span style={{
          width: 6,
          height: 6,
          background: connected ? 'var(--color-success)' : 'var(--color-warning)',
          display: 'inline-block',
          flexShrink: 0,
        }} title={connected ? 'Live updates connected' : 'Reconnecting…'} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
          {connected ? 'live' : 'connecting…'}
        </span>
      </div>

      {error && (
        <div style={{
          background: 'var(--color-danger-subtle)',
          border: '1px solid var(--color-danger)',
          color: 'var(--color-danger)',
          padding: '8px 12px',
          marginBottom: 16,
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {error}
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}>×</button>
        </div>
      )}

      <TabBar active={tab} onChange={setTab} />

      <div style={{ marginTop: 16 }}>
        {tab === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeJobs.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: 13 }}>No active downloads.</p>
            ) : (
              activeJobs.map((job) => (
                <ActiveRow key={job.id} job={job} progress={progressMap[job.id]} onCancel={handleCancel} />
              ))
            )}
          </div>
        )}

        {tab === 'queued' && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {queuedJobs.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>No queued downloads.</p>
            ) : (
              queuedJobs.map((job) => (
                <JobRow key={job.id} job={job} showCancel onCancel={handleCancel} />
              ))
            )}
          </div>
        )}

        {tab === 'history' && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {historyJobs.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>No download history.</p>
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
