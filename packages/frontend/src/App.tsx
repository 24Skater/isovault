import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import Downloads from './pages/Downloads';
import Watchers from './pages/Watchers';
import Archive from './pages/Archive';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';

const navItems = [
  { to: '/',          label: 'Dashboard' },
  { to: '/catalog',   label: 'Catalog'   },
  { to: '/downloads', label: 'Downloads' },
  { to: '/watchers',  label: 'Watchers'  },
  { to: '/archive',   label: 'Archive'   },
  { to: '/audit',     label: 'Audit Log' },
  { to: '/settings',  label: 'Settings'  },
];

export default function App() {
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
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
          }}>
            IsoVault
          </div>
          <div style={{
            marginTop: 6,
            height: 2,
            width: 24,
            background: 'var(--accent)',
          }} />
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
            </NavLink>
          ))}
        </nav>

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
          <Route path="/catalog"   element={<Catalog />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/watchers"  element={<Watchers />} />
          <Route path="/archive"   element={<Archive />} />
          <Route path="/audit"     element={<AuditLog />} />
          <Route path="/settings"  element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
