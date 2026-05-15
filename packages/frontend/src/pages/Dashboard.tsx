import { useState, useCallback, useEffect } from 'react';
import { fetchDashboardStats, type DashboardStats } from '../api/storage';
import type { AuditSeverity } from '../api/audit';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(n: number | null): string {
  if (n === null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        flex: '1 1 160px',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Storage bar ──────────────────────────────────────────────────────────────

function StorageBar({ stats }: { stats: DashboardStats['storage'] }) {
  const pct = stats.totalBytes ? Math.min((stats.usedBytes / stats.totalBytes) * 100, 100) : null;
  const overThreshold = pct !== null && pct >= stats.alertThresholdPercent;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${overThreshold ? 'var(--color-warning)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Storage</span>
        <span style={{ fontSize: 12, color: overThreshold ? 'var(--color-warning)' : 'var(--text-muted)' }}>
          {formatBytes(stats.usedBytes)} used
          {stats.totalBytes ? ` of ${formatBytes(stats.totalBytes)}` : ''}
        </span>
      </div>

      {pct !== null && (
        <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: overThreshold ? 'var(--color-warning)' : 'var(--accent)',
              borderRadius: 4,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}

      {pct !== null && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
          {pct.toFixed(1)}% used · alert at {stats.alertThresholdPercent}%
        </div>
      )}
    </div>
  );
}

// ─── Severity dot ─────────────────────────────────────────────────────────────

const SEV_COLORS: Record<AuditSeverity, string> = {
  info:     'var(--text-muted)',
  warn:     'var(--color-warning)',
  error:    'var(--color-error)',
  critical: 'var(--color-error)',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  if (error) {
    return (
      <div style={{ padding: '24px 32px' }}>
        <div style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: '24px 32px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>
        Dashboard
      </h1>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatCard label="Definitions" value={stats.definitions} />
        <StatCard label="Active Versions" value={stats.versions.active} sub={`${stats.versions.archived} archived`} />
        <StatCard label="Downloads" value={stats.downloads.running} sub={`${stats.downloads.queued} queued`} />
      </div>

      {/* Storage */}
      <div style={{ marginBottom: 20 }}>
        <StorageBar stats={stats.storage} />
      </div>

      {/* Recent events */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Recent Events
          </span>
        </div>

        {stats.recentEvents.length === 0 ? (
          <p style={{ padding: 16, fontSize: 13, color: 'var(--text-muted)' }}>No recent events.</p>
        ) : (
          stats.recentEvents.map((e) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: SEV_COLORS[e.severity] ?? 'var(--text-muted)',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', flex: 1 }}>{e.eventType}</span>
              {e.entityType && (
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{e.entityType}</span>
              )}
              <span style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                {new Date(e.createdAt).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
