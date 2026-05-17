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
      borderRadius: 'var(--radius-lg)',
      padding: '16px 20px',
      flex: '1 1 160px',
    }}>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-muted)',
        marginBottom: 10,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 32,
        fontWeight: 700,
        color: 'var(--text-primary)',
        lineHeight: 1,
        letterSpacing: '-0.01em',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontFamily: 'var(--font-mono)',
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
      borderRadius: 'var(--radius-lg)',
      padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-muted)',
        }}>
          Storage
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: overThreshold ? 'var(--color-warning)' : 'var(--text-secondary)',
        }}>
          {formatBytes(stats.usedBytes)}{stats.totalBytes ? ` / ${formatBytes(stats.totalBytes)}` : ''}
        </span>
      </div>

      {pct !== null && (
        <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
          <div className="progress-fill" style={{
            height: '100%',
            width: `${pct}%`,
            background: overThreshold ? 'var(--color-warning)' : 'var(--accent)',
            borderRadius: 2,
          }} />
        </div>
      )}

      {pct !== null && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-muted)',
          marginTop: 8,
        }}>
          {pct.toFixed(1)}% used · alert at {stats.alertThresholdPercent}%
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
      <div style={{ padding: '28px 28px' }}>
        <div style={{
          background: 'var(--color-error-subtle)',
          border: '1px solid var(--color-danger)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-danger)',
          padding: '10px 14px',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
        }}>
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: '28px 28px' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 28px', maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          marginBottom: 4,
        }}>
          Dashboard
        </h1>
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          color: 'var(--text-secondary)',
        }}>
          Overview of your ISO library and system health
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <StatCard label="Definitions" value={stats.definitions} />
        <StatCard label="Active Versions" value={stats.versions.active} sub={`${stats.versions.archived} archived`} />
        <StatCard label="Active Downloads" value={stats.downloads.running} sub={`${stats.downloads.queued} queued`} />
      </div>

      {/* Storage */}
      <div style={{ marginBottom: 12 }}>
        <StorageBar stats={stats.storage} />
      </div>

      {/* Recent events */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            Recent Events
          </span>
        </div>

        {stats.recentEvents.length === 0 ? (
          <p style={{ padding: '20px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
            No recent events.
          </p>
        ) : (
          stats.recentEvents.map((e) => (
            <div key={e.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono)',
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
              <span style={{ color: 'var(--text-primary)', flex: 1, fontFamily: 'var(--font-sans)', fontSize: 12 }}>
                {e.eventType}
              </span>
              {e.entityType && (
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {e.entityType}
                </span>
              )}
              <span style={{ color: 'var(--text-disabled)', whiteSpace: 'nowrap' }}>
                {new Date(e.createdAt).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
