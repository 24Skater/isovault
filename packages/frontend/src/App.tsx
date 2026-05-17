import { useState, useCallback, useRef } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import Downloads from './pages/Downloads';
import Watchers from './pages/Watchers';
import Archive from './pages/Archive';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';
import Integrations from './pages/Integrations';
import { getApiKey, setApiKey, clearApiKey } from './api/client';
import { useDownloadProgress, type ProgressMap } from './hooks/useDownloadProgress';
import type { WsDownloadProgressEvent } from './api/downloads';
import { ToastContainer, type Toast } from './components/ToastContainer';
import { DownloadStatusBar } from './components/DownloadStatusBar';
import { NotificationBell, type AppNotification } from './components/NotificationCenter';

const navItems = [
  { to: '/',              label: 'Dashboard'    },
  { to: '/catalog',       label: 'Catalog'      },
  { to: '/downloads',     label: 'Downloads'    },
  { to: '/watchers',      label: 'Watchers'     },
  { to: '/archive',       label: 'Archive'      },
  { to: '/audit',         label: 'Audit Log'    },
  { to: '/integrations',  label: 'Integrations' },
  { to: '/settings',      label: 'Settings'     },
];

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) { setError('API key is required'); return; }
    setApiKey(trimmed);
    onLogin();
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-base)',
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        borderRadius: 6, padding: '32px 40px', width: 360,
      }}>
        <div style={{
          fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)',
          marginBottom: 4,
        }}>IsoVault</div>
        <div style={{ height: 2, width: 24, background: 'var(--accent)', marginBottom: 24 }} />
        <form onSubmit={handleSubmit}>
          <label style={{
            display: 'block', fontFamily: 'ui-monospace, monospace', fontSize: 11,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)',
            marginBottom: 8,
          }}>
            API Key
          </label>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="Paste your API key"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box', padding: '8px 10px',
              background: 'var(--bg-base)', border: '1px solid var(--border-default)',
              borderRadius: 4, color: 'var(--text-primary)', fontFamily: 'ui-monospace, monospace',
              fontSize: 12, outline: 'none',
            }}
          />
          {error && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-error, #e05252)' }}>
              {error}
            </div>
          )}
          <button type="submit" style={{
            marginTop: 16, width: '100%', padding: '9px 0',
            background: 'var(--accent)', border: 'none', borderRadius: 4,
            color: '#000', fontFamily: 'ui-monospace, monospace', fontSize: 12,
            fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}>
            Connect
          </button>
        </form>
      </div>
    </div>
  );
}

function AppShell() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [activeJobIds, setActiveJobIds] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const toastIdRef = useRef(0);
  const notifIdRef = useRef(0);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = String(++toastIdRef.current);
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const addNotification = useCallback((type: AppNotification['type'], message: string) => {
    const id = String(++notifIdRef.current);
    setNotifications(prev => [{ id, type, message, timestamp: new Date(), read: false }, ...prev]);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setNotificationsOpen(false);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useDownloadProgress({
    onProgress: useCallback((event: WsDownloadProgressEvent) => {
      setProgressMap(prev => ({ ...prev, [event.jobId]: event }));
      setActiveJobIds(prev => new Set([...prev, event.jobId]));
    }, []),
    onCompleted: useCallback((jobId: string, _versionId: string) => {
      setActiveJobIds(prev => { const next = new Set(prev); next.delete(jobId); return next; });
      setProgressMap(prev => { const next = { ...prev }; delete next[jobId]; return next; });
      addToast('success', 'Download complete — ISO is ready.');
      addNotification('success', 'Download complete — ISO is ready.');
    }, [addToast, addNotification]),
    onFailed: useCallback((jobId: string, errorMessage: string) => {
      setActiveJobIds(prev => { const next = new Set(prev); next.delete(jobId); return next; });
      setProgressMap(prev => { const next = { ...prev }; delete next[jobId]; return next; });
      addToast('error', `Download failed: ${errorMessage}`);
      addNotification('error', `Download failed: ${errorMessage}`);
    }, [addToast, addNotification]),
  });

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside style={{
        display: 'flex',
        flexDirection: 'column',
        width: 180,
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)',
            }}>
              IsoVault
            </div>
            <div style={{ marginTop: 6, height: 2, width: 24, background: 'var(--accent)' }} />
          </div>
          <NotificationBell
            notifications={notifications}
            open={notificationsOpen}
            onToggle={() => setNotificationsOpen(o => !o)}
            onClose={() => setNotificationsOpen(false)}
            onMarkRead={markNotificationRead}
            onMarkAllRead={markAllNotificationsRead}
            onClearAll={clearAllNotifications}
          />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 0' }}>
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                padding: '7px 20px',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                background: 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: 'ui-monospace, monospace',
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                transition: 'color 120ms, border-color 120ms',
              })}
            >
              {label}
              {label === 'Downloads' && activeJobIds.size > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: 'var(--accent)',
                  color: '#080808',
                  borderRadius: 2,
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '1px 5px',
                  lineHeight: 1.4,
                }}>
                  {activeJobIds.size}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Active download progress in sidebar */}
        <DownloadStatusBar activeCount={activeJobIds.size} progressMap={progressMap} />

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          letterSpacing: '0.05em',
          color: 'var(--text-disabled)',
        }}>
          v1.0.0
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/catalog"   element={<Catalog onNotify={(type, msg) => { addToast(type, msg); addNotification(type, msg); }} />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/watchers"  element={<Watchers />} />
          <Route path="/archive"   element={<Archive />} />
          <Route path="/audit"     element={<AuditLog />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/settings"     element={<Settings />} />
        </Routes>
      </main>

      {/* Global toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => !!getApiKey());

  const handleUnauthorized = useCallback(() => {
    clearApiKey();
    setAuthed(false);
  }, []);

  (window as Window & { __onUnauthorized?: () => void }).__onUnauthorized = handleUnauthorized;

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  return <AppShell />;
}
