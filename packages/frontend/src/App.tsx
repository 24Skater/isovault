import { useState, useCallback, useRef, useEffect } from 'react';
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

const NAV_SECTIONS = [
  {
    label: 'Library',
    items: [
      { to: '/',           label: 'Dashboard'    },
      { to: '/catalog',    label: 'Catalog'      },
      { to: '/downloads',  label: 'Downloads'    },
      { to: '/watchers',   label: 'Watchers'     },
      { to: '/archive',    label: 'Archive'      },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/audit',        label: 'Audit Log'    },
      { to: '/integrations', label: 'Integrations' },
      { to: '/settings',     label: 'Settings'     },
    ],
  },
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
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px 40px',
        width: 360,
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          marginBottom: 4,
        }}>IsoVault</div>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          color: 'var(--text-muted)',
          marginBottom: 28,
        }}>Enter your API key to continue</div>
        <form onSubmit={handleSubmit}>
          <label style={{
            display: 'block',
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 6,
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
              width: '100%',
              boxSizing: 'border-box',
              height: 34,
              padding: '0 10px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              outline: 'none',
            }}
          />
          {error && (
            <div style={{ marginTop: 8, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--color-danger)' }}>
              {error}
            </div>
          )}
          <button type="submit" style={{
            marginTop: 16,
            width: '100%',
            height: 36,
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-fg)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            Connect
          </button>
        </form>
      </div>
    </div>
  );
}

type Theme = 'dark' | 'light' | 'system';

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('isovault_theme') as Theme | null) ?? 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('isovault_theme', theme);
  }, [theme]);

  return [theme, setThemeState];
}

function AppShell() {
  const [theme, setTheme] = useTheme();
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
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        display: 'flex',
        flexDirection: 'column',
        width: 'var(--sidebar-width)',
        flexShrink: 0,
        background: '#18181b',
        borderRight: '1px solid #27272a',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 10,
        overflowY: 'auto',
      }}>
        {/* Gradient header */}
        <div style={{
          padding: '20px 16px 18px',
          background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
          borderBottom: '1px solid rgba(99,102,241,0.6)',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.01em',
          }}>
            IsoVault
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            color: 'rgba(255,255,255,0.55)',
            marginTop: 2,
          }}>
            ISO Management
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
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
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 8, paddingBottom: 8 }}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} style={{ marginBottom: 4 }}>
              <div style={{
                padding: '8px 16px 4px',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 400,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.10em',
                color: '#52525b',
              }}>
                {section.label}
              </div>
              {section.items.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    height: 34,
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    background: isActive ? 'var(--accent-subtle)' : 'transparent',
                    color: isActive ? 'var(--accent)' : '#71717a',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    textDecoration: 'none',
                    transition: 'background 80ms, color 80ms, border-color 80ms',
                    gap: 8,
                  })}
                >
                  {label}
                  {label === 'Downloads' && activeJobIds.size > 0 && (
                    <span style={{
                      marginLeft: 'auto',
                      background: 'var(--accent)',
                      color: 'var(--accent-fg)',
                      borderRadius: 9999,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '1px 6px',
                      lineHeight: 1.4,
                    }}>
                      {activeJobIds.size}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Active download progress */}
        <DownloadStatusBar activeCount={activeJobIds.size} progressMap={progressMap} />

        {/* Footer — theme toggle + version */}
        <div style={{
          padding: '10px 14px',
          borderTop: '1px solid #27272a',
          background: '#09090b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.05em',
            color: '#52525b',
          }}>
            v1.0.0
          </span>
          <div style={{ display: 'flex', gap: 2 }}>
            {(['dark', 'light', 'system'] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                title={t.charAt(0).toUpperCase() + t.slice(1)}
                style={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  color: theme === t ? 'var(--accent)' : '#52525b',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'color 120ms',
                }}
              >
                {t === 'dark' ? '●' : t === 'light' ? '○' : '◐'}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        marginLeft: 'var(--sidebar-width)',
        minHeight: '100vh',
      }}>
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
