import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchWatchers, triggerWatcher } from '../api/watchers';
import type { WsVersionDetectedEvent } from '../api/downloads';
import type { IsoDefinition, WatchStrategy } from '../api/definitions';
import { useDownloadProgress } from '../hooks/useDownloadProgress';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

function strategyLabel(s: WatchStrategy | null): string {
  if (!s) return '—';
  const labels: Record<WatchStrategy, string> = {
    rss: 'RSS', html_scrape: 'HTML', json_api: 'JSON', checksum: 'Checksum', filename: 'Filename',
  };
  return labels[s] ?? s;
}

// ─── Strategy badge ───────────────────────────────────────────────────────────

function StrategyBadge({ strategy }: { strategy: WatchStrategy | null }) {
  if (!strategy) {
    return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>none</span>;
  }
  const bgMap: Record<WatchStrategy, string> = {
    rss:         'var(--color-warning-subtle)',
    html_scrape: 'var(--accent-subtle)',
    json_api:    'var(--color-success-subtle)',
    checksum:    'var(--bg-elevated)',
    filename:    'var(--color-danger-subtle)',
  };
  const colorMap: Record<WatchStrategy, string> = {
    rss:         'var(--color-warning)',
    html_scrape: 'var(--accent)',
    json_api:    'var(--color-success)',
    checksum:    'var(--text-secondary)',
    filename:    'var(--color-danger)',
  };
  const bg = bgMap[strategy] ?? 'var(--bg-elevated)';
  const color = colorMap[strategy] ?? 'var(--text-muted)';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 9999,
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 500,
      background: bg,
      color,
    }}>
      {strategyLabel(strategy)}
    </span>
  );
}

// ─── Watcher row ──────────────────────────────────────────────────────────────

interface WatcherRowProps {
  def: IsoDefinition;
  isTriggering: boolean;
  recentDetection: WsVersionDetectedEvent | null;
  onTrigger: (id: string) => void;
}

function WatcherRow({ def, isTriggering, recentDetection, onTrigger }: WatcherRowProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto auto auto auto',
      alignItems: 'center',
      gap: 16,
      padding: '12px 16px',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {def.name}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
          {def.family} · every {def.watchIntervalMinutes} min
        </span>
        {recentDetection && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-success)', marginTop: 2 }}>
            ↑ {recentDetection.versionString}
          </span>
        )}
      </div>

      <StrategyBadge strategy={def.watchStrategy} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Checked</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
          {formatDate(def.watchLastCheckedAt)}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Version</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {def.watchLastVersionFound ?? '—'}
        </span>
      </div>

      <button
        onClick={() => onTrigger(def.id)}
        disabled={isTriggering}
        style={{
          background: 'transparent',
          color: isTriggering ? 'var(--text-muted)' : 'var(--accent)',
          border: `1px solid ${isTriggering ? 'var(--border-default)' : 'var(--accent)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '5px 12px',
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          fontWeight: 500,
          cursor: isTriggering ? 'default' : 'pointer',
          whiteSpace: 'nowrap' as const,
          opacity: isTriggering ? 0.6 : 1,
        }}
      >
        {isTriggering ? 'Checking…' : 'Check now'}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Watchers() {
  const [watchers, setWatchers] = useState<IsoDefinition[]>([]);
  const [triggering, setTriggering] = useState<Set<string>>(new Set());
  const [detections, setDetections] = useState<Record<string, WsVersionDetectedEvent>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const detectionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = detectionTimers.current;
    return () => { timers.forEach((t) => clearTimeout(t)); };
  }, []);

  const loadWatchers = useCallback(async () => {
    try {
      const data = await fetchWatchers();
      setWatchers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load watchers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWatchers();
    const interval = setInterval(() => void loadWatchers(), 30_000);
    return () => clearInterval(interval);
  }, [loadWatchers]);

  const { connected } = useDownloadProgress({
    onVersionDetected: useCallback(
      (event: WsVersionDetectedEvent) => {
        setDetections((prev) => ({ ...prev, [event.definitionId]: event }));
        void loadWatchers();
        const existing = detectionTimers.current.get(event.definitionId);
        if (existing) clearTimeout(existing);
        const t = setTimeout(() => {
          setDetections((prev) => {
            const next = { ...prev };
            delete next[event.definitionId];
            return next;
          });
          detectionTimers.current.delete(event.definitionId);
        }, 10_000);
        detectionTimers.current.set(event.definitionId, t);
      },
      [loadWatchers],
    ),
  });

  const handleTrigger = useCallback(async (id: string) => {
    setTriggering((prev) => new Set(prev).add(id));
    try {
      await triggerWatcher(id);
      await loadWatchers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trigger failed');
    } finally {
      setTriggering((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [loadWatchers]);

  return (
    <div style={{ padding: '28px 28px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          Watchers
          <span style={{ marginLeft: 10, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>
            {watchers.length}
          </span>
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

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto auto',
          gap: 16,
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-default)',
        }}>
          {['Definition', 'Strategy', 'Last Checked', 'Last Version', 'Actions'].map((label) => (
            <span key={label} style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textAlign: label === 'Last Checked' || label === 'Last Version' ? 'right' : 'left',
            }}>
              {label}
            </span>
          ))}
        </div>

        {loading ? (
          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>Loading…</p>
        ) : watchers.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>
            No watch-enabled definitions. Enable watching on a definition in the Catalog.
          </p>
        ) : (
          watchers.map((def) => (
            <WatcherRow
              key={def.id}
              def={def}
              isTriggering={triggering.has(def.id)}
              recentDetection={detections[def.id] ?? null}
              onTrigger={handleTrigger}
            />
          ))
        )}
      </div>
    </div>
  );
}
