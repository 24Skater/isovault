import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import Downloads from './pages/Downloads';
import Watchers from './pages/Watchers';
import Archive from './pages/Archive';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';

const navItems = [
  { to: '/',         label: 'Dashboard' },
  { to: '/catalog',  label: 'Catalog'   },
  { to: '/downloads',label: 'Downloads' },
  { to: '/watchers', label: 'Watchers'  },
  { to: '/archive',  label: 'Archive'   },
  { to: '/audit',    label: 'Audit Log' },
  { to: '/settings', label: 'Settings'  },
];

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col w-56 flex-shrink-0 border-r"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-default)',
        }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-2 px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <span
            className="text-base font-medium tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            IsoVault
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors mb-0.5',
                  isActive
                    ? 'font-medium'
                    : '',
                ].join(' ')
              }
              style={({ isActive }) => ({
                background: isActive ? 'var(--accent-subtle)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t text-xs"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          IsoVault v1.0.0
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
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
