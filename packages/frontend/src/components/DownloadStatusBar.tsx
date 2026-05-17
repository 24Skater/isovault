import type { ProgressMap } from '../hooks/useDownloadProgress';
import { formatBytes } from '../utils/format';

interface Props {
  activeCount: number;
  progressMap: ProgressMap;
}

export function DownloadStatusBar({ activeCount, progressMap }: Props) {
  if (activeCount === 0) return null;

  const events = Object.values(progressMap);
  const latest = events[events.length - 1];

  const percent = latest?.percent ?? null;
  const speed = latest?.speedBytesPerSec ?? null;
  const bytes = latest?.bytesDownloaded ?? null;
  const total = latest?.bytesTotal ?? null;

  return (
    <div style={{
      padding: '10px 14px',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <span style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--accent)',
        }}>
          ↓ {activeCount} downloading
        </span>
        {speed !== null && speed > 0 && (
          <span style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 10,
            color: 'var(--text-muted)',
          }}>
            {formatBytes(speed)}/s
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          background: 'var(--accent)',
          width: percent !== null ? `${Math.min(percent, 100)}%` : '40%',
          opacity: percent === null ? 0.5 : 1,
          transition: percent !== null ? 'width 500ms ease' : undefined,
          animation: percent === null ? 'pulse 1.5s ease-in-out infinite' : undefined,
        }} />
      </div>

      {bytes !== null && (
        <div style={{
          marginTop: 4,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          color: 'var(--text-muted)',
        }}>
          {formatBytes(bytes)}{total ? ` / ${formatBytes(total)}` : ''}
        </div>
      )}
    </div>
  );
}
