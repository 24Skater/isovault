import { useEffect, useRef } from 'react';

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: Date;
  read: boolean;
}

interface Props {
  notifications: AppNotification[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const typeColor: Record<AppNotification['type'], string> = {
  success: 'var(--color-success)',
  error:   'var(--color-danger)',
  info:    'var(--accent)',
};

const typeIcon: Record<AppNotification['type'], string> = {
  success: '✓',
  error:   '✕',
  info:    '·',
};

function BellIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function NotificationItem({ n, onMarkRead }: { n: AppNotification; onMarkRead: (id: string) => void }) {
  return (
    <div
      onClick={() => onMarkRead(n.id)}
      style={{
        display: 'flex',
        gap: 10,
        padding: '12px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        background: n.read ? 'transparent' : 'var(--accent-subtle)',
        cursor: n.read ? 'default' : 'pointer',
        transition: 'background 120ms',
      }}
    >
      <span style={{
        color: typeColor[n.type],
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        flexShrink: 0,
        marginTop: 1,
      }}>
        {typeIcon[n.type]}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)',
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}>
          {n.message}
        </div>
        <div style={{
          marginTop: 4,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-disabled)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {timeAgo(n.timestamp)}
        </div>
      </div>
      {!n.read && (
        <div style={{ width: 6, height: 6, background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: '3px 6px',
};

export function NotificationBell({ notifications, open, onToggle, onClose, onMarkRead, onMarkAllRead, onClearAll }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={onToggle}
        title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          background: open ? 'var(--bg-elevated)' : 'transparent',
          border: '1px solid',
          borderColor: open ? 'var(--border-default)' : 'transparent',
          cursor: 'pointer',
          color: unreadCount > 0 ? 'var(--accent)' : 'var(--text-muted)',
          padding: 0,
          flexShrink: 0,
        }}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 14,
            height: 14,
            background: 'var(--accent)',
            color: 'var(--accent-fg)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            lineHeight: 1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out panel */}
      {open && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 340,
          height: '100vh',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 200,
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideInRight 150ms ease-out',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--text-muted)',
                }}>
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {unreadCount > 0 && (
                <button onClick={onMarkAllRead} style={actionBtnStyle}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={onClearAll} style={{ ...actionBtnStyle, color: 'var(--color-danger)' }}>
                  Clear all
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 16,
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: '2px 6px',
                  marginLeft: 4,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '64px 24px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-disabled)',
              }}>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <NotificationItem key={n.id} n={n} onMarkRead={onMarkRead} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
