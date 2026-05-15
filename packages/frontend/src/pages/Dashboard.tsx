import { useState, useCallback, useEffect } from 'react';
import { fetchDashboardStats, type DashboardStats } from '../api/storage';
import type { AuditSeverity } from '../api/audit';
import { formatBytes } from '../utils/format';

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderTop: '2px solid var(--accent)',
      padding: '16px 20px',
      flex: '1 1 160px',
    }}>
      <div style={{
        fontFamily: 'ui-monospace, monospace',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.10em',
        color: 'var(--text-muted)',
        marginBottom: 10,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'ui-monospace, monospace',
        fontSize: 36,
        fontWeight: 700,
        color: 'var(--text-primary)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
          color: 'var(--text-muted)',
          marginTop: 6,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Storage bar ──────────────────────────────────────────────────────────────

function StorageBar({ stats }: { stats: DashboardStats['storage'] }) {
  const pct = stats.totalBytes ? Math.min((stats.usedBytes / stats.totalBytes) * 100, 100) : null;
  const overThreshold = pct !== null && pct >= stats.alertThresholdPercent;

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${overThreshold ? 'var(--color-warning)' : 'var(--border-default)'}`,
      borderTop: `2px solid ${overThreshold ? 'var(--color-warning)' : 'var(--border-strong)'}`,
      padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.10em',
          color: 'var(--text-muted)',
        }}>
          Storage
        </span>
        <span style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
          color: overThreshold ? 'var(--color-warning)' : 'var(--text-secondary)',
        }}>
          {formatBytes(stats.usedBytes)}{stats.totalBytes ? ` / ${formatBytes(stats.totalBytes)}` : ''}
        </span>
      </div>

      {pct !== null && (
        <div style={{ height: 4, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
          <div className="progress-fill" style={{
            height: '100%',
            width: `${pct}%`,
            background: overThreshold ? 'var(--color-warning)' : 'var(--accent)',
          }} />
        </div>
      )}

      {pct !== null && (
        <div style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          color: 'var(--text-muted)',
          marginTop: 8,
        }}>
          {pct.toFixed(1)}% USED · ALERT AT {stats.alertThresholdPercent}%
        </div>
      )}
    </div>
  );
}

// ─── Severity prefix ──────────────────────────────────────────────────────────

const SEV_COLORS: Record<AuditSeverity, string> = {
  info:     'var(--text-muted)',
  warn:     'var(--color-warning)',
  error:    'var(--color-error)',
  critical: 'var(--color-error)',
};

const SEV_LABELS: Record<AuditSeverity, string> = {
  info:     'INFO',
  warn:     'WARN',
  error:    'ERR ',
  critical: 'CRIT',
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
        <div style={{
          background: 'var(--color-error-subtle)',
          border: '1px solid var(--color-error)',
          color: 'var(--color-error)',
          padding: '10px 14px',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 12,
        }}>
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: '24px 32px' }}>
        <p style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--text-muted)', fontSize: 12 }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900 }}>
      <h1 style={{
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: 'var(--text-secondary)',
        marginBottom: 4,
      }}>
        Dashboard
      </h1>
      <div className="page-rule" />

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 1, marginBottom: 1 }}>
        <StatCard label="Definitions" value={stats.definitions} />
        <StatCard label="Active Versions" value={stats.versions.active} sub={`${stats.versions.archived} archived`} />
        <StatCard label="Active Downloads" value={stats.downloads.running} sub={`${stats.downloads.queued} queued`} />
      </div>

      {/* Storage */}
      <div style={{ marginBottom: 1 }}>
        <StorageBar stats={stats.storage} />
      </div>

      {/* Recent events */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-default)',
          background: 'var(--bg-elevated)',
        }}>
          <span style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
          }}>
            Recent Events
          </span>
        </div>

        {stats.recentEvents.length === 0 ? (
          <p style={{ padding: '14px 16px', fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'var(--text-muted)' }}>
            No recent events.
          </p>
        ) : (
          stats.recentEvents.map((e) => (
            <div key={e.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              fontFamily: 'ui-monospace, monospace',
              fontSize: 11,
            }}>
              <span style={{
                color: SEV_COLORS[e.severity] ?? 'var(--text-muted)',
                fontWeight: 700,
                letterSpacing: '0.06em',
                flexShrink: 0,
                width: 32,
              }}>
                {SEV_LABELS[e.severity] ?? 'INFO'}
              </span>
              <span style={{ color: 'var(--text-primary)', flex: 1 }}>{e.eventType}</span>
              {e.entityType && (
                <span style={{ color: 'var(--text-muted)' }}>{e.entityType}</span>
              )}
              <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {new Date(e.createdAt).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
