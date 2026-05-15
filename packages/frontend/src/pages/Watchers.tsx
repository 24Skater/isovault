import { useState, useCallback, useEffect } from 'react';
import { fetchWatchers, triggerWatcher } from '../api/watchers';
import type { WsVersionDetectedEvent } from '../api/downloads';
import type { IsoDefinition, WatchStrategy } from '../api/definitions';
import { useDownloadProgress } from '../hooks/useDownloadProgress';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function strategyLabel(s: WatchStrategy | null): string {
  if (!s) return '—';
  const labels: Record<WatchStrategy, string> = {
    rss: 'RSS',
    html_scrape: 'HTML Scrape',
    json_api: 'JSON API',
    checksum: 'Checksum',
    filename: 'Filename',
  };
  return labels[s] ?? s;
}

// ─── Strategy badge ───────────────────────────────────────────────────────────

function StrategyBadge({ strategy }: { strategy: WatchStrategy | null }) {
  if (!strategy) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>none</span>;

  const colors: Record<WatchStrategy, { bg: string; color: string }> = {
    rss:        { bg: 'var(--color-warning-subtle)',  color: 'var(--color-warning)'  },
    html_scrape:{ bg: 'var(--accent-subtle)',         color: 'var(--accent)'         },
    json_api:   { bg: 'var(--color-success-subtle)',  color: 'var(--color-success)'  },
    checksum:   { bg: 'var(--bg-elevated)',           color: 'var(--text-secondary)' },
    filename:   { bg: 'var(--color-error-subtle)',    color: 'var(--color-error)'    },
  };

  const { bg, color } = colors[strategy] ?? colors.rss;

  return (
    <span
      style={{
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: 'var(--radius-sm)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
    >
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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto auto',
        alignItems: 'center',
        gap: 16,
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        flexWrap: 'wrap',
      }}
    >
      {/* Name + family */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {def.name}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {def.family} · every {def.watchIntervalMinutes} min
        </span>
        {recentDetection && (
          <span style={{ fontSize: 11, color: 'var(--color-success)', marginTop: 2 }}>
            New version detected: {recentDetection.versionString}
          </span>
        )}
      </div>

      {/* Strategy badge */}
      <StrategyBadge strategy={def.watchStrategy} />

      {/* Last checked */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last checked</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {formatDate(def.watchLastCheckedAt)}
        </span>
      </div>

      {/* Last version found */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last version</span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
          }}
        >
          {def.watchLastVersionFound ?? '—'}
        </span>
      </div>

      {/* Trigger button */}
      <button
        onClick={() => onTrigger(def.id)}
        disabled={isTriggering}
        style={{
          background: isTriggering ? 'var(--bg-elevated)' : 'var(--accent-subtle)',
          color: isTriggering ? 'var(--text-muted)' : 'var(--accent)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          padding: '5px 14px',
          fontSize: 12,
          fontWeight: 600,
          cursor: isTriggering ? 'default' : 'pointer',
          whiteSpace: 'nowrap',
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

  // Listen for version.detected events via the shared WS connection
  const { connected } = useDownloadProgress({
    onVersionDetected: useCallback(
      (event: WsVersionDetectedEvent) => {
        setDetections((prev) => ({ ...prev, [event.definitionId]: event }));
        // Reload so last-checked / last-version columns update
        void loadWatchers();
        // Clear the highlight after 10 seconds
        setTimeout(() => {
          setDetections((prev) => {
            const next = { ...prev };
            delete next[event.definitionId];
            return next;
          });
        }, 10_000);
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
    <div style={{ padding: '24px 32px', maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Watchers</h1>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: connected ? 'var(--color-success)' : 'var(--color-warning)',
            display: 'inline-block',
          }}
          title={connected ? 'Live updates connected' : 'Reconnecting…'}
        />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {connected ? 'live' : 'connecting…'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {watchers.length} watcher{watchers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            background: 'var(--color-error-subtle)',
            color: 'var(--color-error)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 12,
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Table */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto auto',
            gap: 16,
            padding: '8px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
          }}
        >
          {['Definition', 'Strategy', 'Last Checked', 'Last Version', ''].map((label) => (
            <span
              key={label}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                textAlign: label === 'Last Checked' || label === 'Last Version' ? 'right' : 'left',
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>Loading…</p>
        ) : watchers.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>
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
