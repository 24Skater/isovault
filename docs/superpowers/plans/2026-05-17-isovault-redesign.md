# IsoVault Full Design System Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Industrial Brutalist acid-yellow aesthetic with a Zinc + Indigo shadcn-style dark SaaS dashboard using Inter + monospace typography and a branded gradient sidebar.

**Architecture:** Pure frontend restyling — all business logic, API wiring, routing, and state management stay unchanged. Changes flow from a CSS token update in `index.css` (which cascades to all components via CSS variables) plus targeted structural changes to the sidebar in `App.tsx` and layout changes in specific pages.

**Tech Stack:** React, TypeScript, inline styles + CSS custom properties, Inter via Google Fonts, React Router

---

## File Map

| File | Change type |
|------|------------|
| `packages/frontend/index.html` | Update Inter font weights (add 600, 700) |
| `packages/frontend/src/index.css` | Full rewrite — Zinc + Indigo token system |
| `packages/frontend/src/App.tsx` | Sidebar redesign: gradient header, section labels, Inter nav |
| `packages/frontend/src/pages/Dashboard.tsx` | Restyle stat cards and layout to Inter + rounded tokens |
| `packages/frontend/src/pages/Catalog.tsx` | Filter bar, table restyle, button restyle, modal restyle |
| `packages/frontend/src/pages/Downloads.tsx` | Table restyle, progress bar colors |
| `packages/frontend/src/pages/Watchers.tsx` | Table restyle |
| `packages/frontend/src/pages/AuditLog.tsx` | Table restyle |
| `packages/frontend/src/pages/Settings.tsx` | Two-column layout |
| `packages/frontend/src/pages/Integrations.tsx` | Card list view for tokens |
| `packages/frontend/src/components/ImportIsoModal.tsx` | Modal restyle (16px radius, blur backdrop) |
| `packages/frontend/src/components/NotificationCenter.tsx` | Panel restyle |
| `packages/frontend/src/components/VersionTimeline.tsx` | Timeline restyle |
| `packages/frontend/src/components/ToastContainer.tsx` | Toast restyle (rounded, slideInUp) |
| `packages/frontend/src/components/DownloadStatusBar.tsx` | Progress bar restyle |

---

## Task 1: Update Font Loading

**Files:**
- Modify: `packages/frontend/index.html`

- [ ] **Step 1: Update the Google Fonts link to include Inter weights 600 and 700**

Replace the existing fonts link in `index.html` `<head>` with:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

Remove the JetBrains Mono entry — the app will use `ui-monospace` system stack instead.

- [ ] **Step 2: Verify the dev server starts and Inter loads**

```bash
cd packages/frontend && npm run dev
```

Open http://localhost:5173 and confirm no console errors about font loading.

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/index.html
git commit -m "feat: update Inter font weights and drop JetBrains Mono"
```

---

## Task 2: Replace CSS Design Tokens

**Files:**
- Modify: `packages/frontend/src/index.css`

- [ ] **Step 1: Replace `:root` token block with Zinc + Indigo system**

Replace the entire `:root { ... }` block (lines 10–63 in the current file) with:

```css
:root {
  /* Font stacks */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', Menlo, 'Cascadia Code', monospace;

  /* Layout */
  --sidebar-width: 220px;
  --topbar-height: 48px;

  /* Surfaces */
  --bg-base:      #09090b;
  --bg-surface:   #18181b;
  --bg-elevated:  #27272a;
  --bg-input:     #09090b;

  /* Borders */
  --border-subtle:  #27272a;
  --border-default: #3f3f46;
  --border-strong:  #52525b;

  /* Typography */
  --text-primary:   #fafafa;
  --text-secondary: #a1a1aa;
  --text-muted:     #71717a;
  --text-disabled:  #52525b;

  /* Accent — Indigo */
  --accent:        #6366f1;
  --accent-hover:  #4f46e5;
  --accent-fg:     #ffffff;
  --accent-subtle: rgba(99, 102, 241, 0.08);

  /* Semantic */
  --color-success:        #22c55e;
  --color-success-subtle: rgba(34, 197, 94, 0.12);
  --color-warning:        #f59e0b;
  --color-warning-subtle: rgba(245, 158, 11, 0.12);
  --color-danger:         #ef4444;
  --color-danger-subtle:  rgba(239, 68, 68, 0.12);
  --color-error:          var(--color-danger);
  --color-error-subtle:   var(--color-danger-subtle);

  /* Status (kept for backwards compat) */
  --status-active:   #22c55e;
  --status-download: #6366f1;
  --status-archive:  #52525b;
  --status-corrupt:  #ef4444;
  --status-pending:  #f59e0b;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-xl: 16px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.6);
}
```

- [ ] **Step 2: Replace `[data-theme="light"]` block**

Replace the existing `[data-theme="light"] { ... }` block with:

```css
[data-theme="light"] {
  --bg-base:      #f4f4f5;
  --bg-surface:   #ffffff;
  --bg-elevated:  #f4f4f5;
  --bg-input:     #ffffff;

  --border-subtle:  #e4e4e7;
  --border-default: #d4d4d8;
  --border-strong:  #a1a1aa;

  --text-primary:   #09090b;
  --text-secondary: #52525b;
  --text-muted:     #71717a;
  --text-disabled:  #a1a1aa;

  --accent:        #4f46e5;
  --accent-hover:  #4338ca;
  --accent-fg:     #ffffff;
  --accent-subtle: rgba(79, 70, 229, 0.08);

  --color-success:        #16a34a;
  --color-success-subtle: rgba(22, 163, 74, 0.10);
  --color-warning:        #d97706;
  --color-warning-subtle: rgba(217, 119, 6, 0.10);
  --color-danger:         #dc2626;
  --color-danger-subtle:  rgba(220, 38, 38, 0.10);

  --status-active:   #16a34a;
  --status-download: #4f46e5;
  --status-archive:  #a1a1aa;
  --status-corrupt:  #dc2626;
  --status-pending:  #d97706;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.10);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.14);
}
```

- [ ] **Step 3: Replace the system preference `@media` block**

Replace the existing `@media (prefers-color-scheme: light)` block with the same tokens as the light block above, applied to `:root:not([data-theme="dark"])`.

```css
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --bg-base:      #f4f4f5;
    --bg-surface:   #ffffff;
    --bg-elevated:  #f4f4f5;
    --bg-input:     #ffffff;
    --border-subtle:  #e4e4e7;
    --border-default: #d4d4d8;
    --border-strong:  #a1a1aa;
    --text-primary:   #09090b;
    --text-secondary: #52525b;
    --text-muted:     #71717a;
    --text-disabled:  #a1a1aa;
    --accent:        #4f46e5;
    --accent-hover:  #4338ca;
    --accent-fg:     #ffffff;
    --accent-subtle: rgba(79, 70, 229, 0.08);
    --color-success:        #16a34a;
    --color-success-subtle: rgba(22, 163, 74, 0.10);
    --color-warning:        #d97706;
    --color-warning-subtle: rgba(217, 119, 6, 0.10);
    --color-danger:         #dc2626;
    --color-danger-subtle:  rgba(220, 38, 38, 0.10);
    --color-error:          var(--color-danger);
    --color-error-subtle:   var(--color-danger-subtle);
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.10);
  }
}
```

- [ ] **Step 4: Update the `body` rule and add font-family variables**

Replace the `body` rule:

```css
body {
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.5;
  background: var(--bg-base);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code, pre, .font-mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
```

- [ ] **Step 5: Add new keyframe animations at the end of the animations section**

Inside the `@media (prefers-reduced-motion: no-preference)` block, add:

```css
  @keyframes slideInUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }

  .animate-slide-in-up {
    animation: slideInUp 180ms ease-out;
  }
```

Also add the reduced motion override at the very end of the file:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
}
```

- [ ] **Step 6: Open browser and verify the color shift is visible**

The app background should now be `#09090b` (near-black zinc) and the accent color should appear as indigo (`#6366f1`) instead of electric blue. Nav active states, buttons, and badges should all shift to indigo.

- [ ] **Step 7: Commit**

```bash
git add packages/frontend/src/index.css
git commit -m "feat: replace CSS tokens with Zinc+Indigo design system"
```

---

## Task 3: Redesign Sidebar and App Shell

**Files:**
- Modify: `packages/frontend/src/App.tsx`

This task replaces the sidebar's visual treatment. All logic (theme toggle, nav links, notification bell, download status bar) stays unchanged.

- [ ] **Step 1: Update the `navItems` array with section grouping**

Replace the flat `navItems` array with two grouped sections:

```typescript
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
```

- [ ] **Step 2: Replace the `<aside>` sidebar JSX**

Replace the entire `<aside>` element (from `<aside style={{` to the closing `</aside>`) with:

```tsx
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
          textTransform: 'uppercase',
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
```

- [ ] **Step 3: Update `<main>` to offset by sidebar width**

Update the `<main>` element style:

```tsx
<main style={{
  flex: 1,
  overflow: 'auto',
  marginLeft: 'var(--sidebar-width)',
  minHeight: '100vh',
}}>
```

Also update the outer `<div>` wrapper to not use flexbox (since sidebar is now fixed):

```tsx
<div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
```

- [ ] **Step 4: Remove old `navItems` array**

Delete the old `const navItems = [...]` array that is no longer used.

- [ ] **Step 5: Verify in browser**

The sidebar should now show:
- Indigo-to-violet gradient header with "IsoVault" in white Inter 700 and "ISO Management" subtitle
- Two nav sections: "LIBRARY" and "SYSTEM" in small monospace uppercase labels
- Active nav item with left indigo border and indigo text on subtle indigo background
- Dark footer strip with theme toggle icons and version

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/App.tsx
git commit -m "feat: redesign sidebar with gradient header and section grouping"
```

---

## Task 4: Restyle Dashboard

**Files:**
- Modify: `packages/frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Update `StatCard` component**

Replace the `StatCard` function with:

```tsx
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
```

- [ ] **Step 2: Update `StorageBar` component**

Replace the `StorageBar` function with:

```tsx
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
```

- [ ] **Step 3: Update the page title and layout in `Dashboard` return**

Replace the page title `<h1>` with Inter font and update the stat cards container:

```tsx
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
```

Also remove `<div className="page-rule" />` since the new layout uses spacing instead.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/pages/Dashboard.tsx
git commit -m "feat: restyle Dashboard with Zinc/Indigo tokens and Inter typography"
```

---

## Task 5: Restyle Catalog Page

**Files:**
- Modify: `packages/frontend/src/pages/Catalog.tsx`

- [ ] **Step 1: Update shared styles at the top of the file**

Replace the `inputStyle` constant:

```typescript
const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 34,
  padding: '0 10px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  outline: 'none',
};

const btnStyle: React.CSSProperties = {
  padding: '5px 12px',
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};
```

- [ ] **Step 2: Update the `Field` component label style**

```tsx
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{
        display: 'block',
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-muted)',
        marginBottom: 5,
      }}>
        {label}
        {hint && <span style={{ marginLeft: 6, fontWeight: 400, opacity: 0.7, textTransform: 'none', letterSpacing: 0 }}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}
```

- [ ] **Step 3: Update the page header and action buttons**

Replace the header section in the `Catalog` return (from `<div style={{ padding: '24px 32px'` to just before `{/* Search */}`):

```tsx
<div style={{ padding: '28px 28px' }}>
  {/* Header */}
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
    <div>
      <h1 style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--text-primary)',
        letterSpacing: '-0.02em',
        marginBottom: 4,
      }}>
        ISO Catalog
        <span style={{
          marginLeft: 10,
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 400,
          color: 'var(--text-muted)',
        }}>
          {total}
        </span>
      </h1>
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={() => setShowImport(true)}
        style={{
          padding: '7px 14px',
          background: 'transparent',
          color: 'var(--accent)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        ↑ Import ISO
      </button>
      <button
        onClick={() => setModal({ type: 'add' })}
        style={{
          padding: '7px 14px',
          background: 'var(--accent)',
          color: 'var(--accent-fg)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        + Add Definition
      </button>
    </div>
  </div>
```

- [ ] **Step 4: Update the search/filter bar**

Replace the search `<div style={{ marginBottom: 16 }}>` section:

```tsx
{/* Filter bar */}
<div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
  <input
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Search by name or family…"
    style={{ ...inputStyle, flex: 1, maxWidth: 320 }}
  />
</div>
```

- [ ] **Step 5: Update the table wrapper and header**

Replace the `<div style={{ border: '1px solid var(--border-default)', overflow: 'hidden' }}>` table container:

```tsx
<div style={{ overflow: 'hidden' }}>
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
    <thead>
      <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
        {['Name', 'Family', 'Architecture', 'Watch', 'Retention', ''].map((h) => (
          <th key={h} style={{
            textAlign: 'left',
            padding: '10px 16px',
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
          }}>
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {/* ... existing tbody content ... */}
    </tbody>
  </table>
</div>
```

- [ ] **Step 6: Update table rows**

In the `definitions.map` call, update the row styling:

```tsx
definitions.map((def, i) => (
  <tr key={def.id} style={{
    borderBottom: '1px solid var(--border-subtle)',
    background: 'transparent',
    transition: 'background 80ms',
  }}
  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
  >
    <td style={{ padding: '12px 16px' }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>
        {def.name}
      </div>
      {def.description && (
        <div style={{ fontSize: 11, marginTop: 2, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {def.description}
        </div>
      )}
    </td>
    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
      {def.family}
    </td>
    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
      {def.architecture}
    </td>
    <td style={{ padding: '12px 16px' }}>
      <WatchBadge enabled={def.watchEnabled} />
    </td>
    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
      keep {def.retentionCount} · {def.retentionBehavior}
    </td>
    <td style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button style={btnStyle} onClick={() => setModal({ type: 'versions', def })}>Versions</button>
        <button style={btnStyle} onClick={() => setModal({ type: 'edit', def })}>Edit</button>
        <button
          style={{ ...btnStyle, color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.4)' }}
          onClick={() => setConfirmDelete(def)}
        >
          Delete
        </button>
      </div>
    </td>
  </tr>
))
```

- [ ] **Step 7: Update the `DefinitionModal` to use new modal spec**

Update the `<form>` in `DefinitionModal` to use rounded corners and blur backdrop:

```tsx
{/* Backdrop */}
<div
  style={{
    position: 'fixed', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    overflowY: 'auto', padding: '64px 16px',
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(2px)',
  }}
  onClick={handleBackdropClick}
>
  <form
    onSubmit={(e) => void handleSubmit(e)}
    style={{
      width: '100%', maxWidth: 520,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)',
      padding: '24px',
      animation: 'slideInUp 180ms ease-out',
    }}
  >
```

And update the modal header text to Inter:

```tsx
<div style={{
  fontFamily: 'var(--font-sans)',
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--text-primary)',
}}>
  {editing ? 'Edit Definition' : 'Add Definition'}
</div>
```

- [ ] **Step 8: Update the versions panel modal**

Replace the versions panel wrapper with:

```tsx
<div style={{
  position: 'fixed', inset: 0, zIndex: 50,
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  overflowY: 'auto', padding: '64px 16px',
  background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(2px)',
}}
  onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
>
  <div style={{
    width: '100%', maxWidth: 680,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xl)',
    padding: '24px',
    animation: 'slideInUp 180ms ease-out',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--text-primary)',
      }}>
        {modal.def.name} — Versions
      </div>
      <button
        onClick={() => setModal(null)}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer' }}
      >
        ✕
      </button>
    </div>
    <VersionTimeline definition={modal.def} />
  </div>
</div>
```

- [ ] **Step 9: Update `WatchBadge` to use pill style**

```tsx
function WatchBadge({ enabled }: { enabled: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 9999,
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 500,
      background: enabled ? 'var(--color-success-subtle)' : 'var(--bg-elevated)',
      color: enabled ? 'var(--color-success)' : 'var(--text-muted)',
      border: `1px solid ${enabled ? 'rgba(34,197,94,0.25)' : 'var(--border-default)'}`,
    }}>
      {enabled ? 'Watching' : 'Manual'}
    </span>
  );
}
```

- [ ] **Step 10: Commit**

```bash
git add packages/frontend/src/pages/Catalog.tsx
git commit -m "feat: restyle Catalog with new table, buttons, and modal design"
```

---

## Task 6: Restyle Downloads, Watchers, AuditLog Pages

**Files:**
- Modify: `packages/frontend/src/pages/Downloads.tsx`
- Modify: `packages/frontend/src/pages/Watchers.tsx`
- Modify: `packages/frontend/src/pages/AuditLog.tsx`

These three pages follow the same table pattern. Apply these changes to each:

- [ ] **Step 1: Update page title to Inter in `Downloads.tsx`**

Find the page `<h1>` or title element and update to:

```tsx
<h1 style={{
  fontFamily: 'var(--font-sans)',
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--text-primary)',
  letterSpacing: '-0.02em',
  marginBottom: 4,
}}>
  Downloads
</h1>
```

Wrap page content in `<div style={{ padding: '28px 28px' }}>` if not already using that padding.

- [ ] **Step 2: Update `StatusBadge` in `Downloads.tsx` to use pill style**

```tsx
function StatusBadge({ status }: { status: DownloadJobStatus }) {
  const bg: Record<DownloadJobStatus, string> = {
    queued:    'var(--color-warning-subtle)',
    running:   'var(--accent-subtle)',
    paused:    'var(--bg-elevated)',
    completed: 'var(--color-success-subtle)',
    failed:    'var(--color-danger-subtle)',
    cancelled: 'var(--bg-elevated)',
  };
  const color: Record<DownloadJobStatus, string> = {
    queued:    'var(--color-warning)',
    running:   'var(--accent)',
    paused:    'var(--text-muted)',
    completed: 'var(--color-success)',
    failed:    'var(--color-danger)',
    cancelled: 'var(--text-muted)',
  };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 9999,
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 500,
      background: bg[status],
      color: color[status],
    }}>
      {status}
    </span>
  );
}
```

- [ ] **Step 3: Update table header row in `Downloads.tsx`**

Change all `<th>` elements to:

```tsx
<th style={{
  textAlign: 'left',
  padding: '10px 16px',
  fontFamily: 'var(--font-sans)',
  fontSize: 11,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border-default)',
}}>
```

- [ ] **Step 4: Apply same page title and table header updates to `Watchers.tsx` and `AuditLog.tsx`**

In `Watchers.tsx`, the page title should read "Watchers". In `AuditLog.tsx`, "Audit Log". Apply the same `<th>` style pattern from step 3.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/pages/Downloads.tsx packages/frontend/src/pages/Watchers.tsx packages/frontend/src/pages/AuditLog.tsx
git commit -m "feat: restyle Downloads, Watchers, and AuditLog pages"
```

---

## Task 7: Restyle Settings Page

**Files:**
- Modify: `packages/frontend/src/pages/Settings.tsx`

- [ ] **Step 1: Read the current Settings.tsx structure**

```bash
cat packages/frontend/src/pages/Settings.tsx
```

- [ ] **Step 2: Wrap content in two-column layout**

Replace the outer wrapper with a two-column layout — a 160px fixed nav list on the left and a content panel on the right. The nav list and content panel use the same tab-switching mechanism that already exists in Settings.tsx (or implement it if it doesn't exist):

```tsx
<div style={{ padding: '28px 28px' }}>
  <div style={{ marginBottom: 24 }}>
    <h1 style={{
      fontFamily: 'var(--font-sans)',
      fontSize: 20,
      fontWeight: 700,
      color: 'var(--text-primary)',
      letterSpacing: '-0.02em',
    }}>
      Settings
    </h1>
  </div>

  <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
    {/* Settings nav */}
    <div style={{ width: 160, flexShrink: 0 }}>
      {['General', 'Storage', 'Authentication', 'Advanced'].map((section) => (
        <button
          key={section}
          onClick={() => setActiveSection(section)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '7px 10px',
            background: activeSection === section ? 'var(--accent-subtle)' : 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: activeSection === section ? 'var(--accent)' : 'var(--text-muted)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: activeSection === section ? 500 : 400,
            cursor: 'pointer',
            marginBottom: 2,
          }}
        >
          {section}
        </button>
      ))}
    </div>

    {/* Content panel */}
    <div style={{ flex: 1 }}>
      {/* render current section's form fields in a card */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
      }}>
        {/* existing settings fields go here */}
      </div>
    </div>
  </div>
</div>
```

Add a `const [activeSection, setActiveSection] = useState('General')` state variable at the top of the component if one doesn't exist.

- [ ] **Step 3: Update form fields within Settings**

For each form field in Settings, use the same `inputStyle` pattern from Catalog:

```typescript
const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 34,
  padding: '0 10px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  outline: 'none',
};
```

Update Save/Cancel buttons to match the primary/secondary button styles from the spec:

```tsx
<button style={{
  padding: '7px 16px',
  background: 'var(--accent)',
  color: 'var(--accent-fg)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}}>
  Save Changes
</button>
```

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/pages/Settings.tsx
git commit -m "feat: restyle Settings with two-column layout and updated form styles"
```

---

## Task 8: Restyle Integrations Page (Card List)

**Files:**
- Modify: `packages/frontend/src/pages/Integrations.tsx`

- [ ] **Step 1: Read the current Integrations.tsx**

```bash
cat packages/frontend/src/pages/Integrations.tsx
```

- [ ] **Step 2: Update page title and "Create Token" button**

```tsx
<div style={{ padding: '28px 28px' }}>
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
    <div>
      <h1 style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--text-primary)',
        letterSpacing: '-0.02em',
        marginBottom: 4,
      }}>
        Integrations
      </h1>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>
        API tokens for read-only external access
      </p>
    </div>
    <button
      onClick={() => setShowCreate(true)}
      style={{
        padding: '7px 14px',
        background: 'var(--accent)',
        color: 'var(--accent-fg)',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      + Create Token
    </button>
  </div>
```

- [ ] **Step 3: Replace token table/list with card grid**

Replace the existing token list rendering with a card-per-token layout:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
  {tokens.map((token) => (
    <div key={token.id} style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      opacity: token.revoked ? 0.5 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {token.name}
          </span>
          {token.revoked && (
            <span style={{
              padding: '2px 8px',
              borderRadius: 9999,
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 500,
              background: 'var(--color-danger-subtle)',
              color: 'var(--color-danger)',
            }}>
              Revoked
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-disabled)',
          }}>
            Created {new Date(token.createdAt).toLocaleDateString()}
          </span>
          {token.lastUsedAt && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-disabled)',
            }}>
              Last used {new Date(token.lastUsedAt).toLocaleDateString()}
            </span>
          )}
          {token.description && (
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>
              {token.description}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {!token.revoked && (
          <button
            onClick={() => void handleRevoke(token.id)}
            style={{
              padding: '5px 12px',
              background: 'transparent',
              color: 'var(--color-warning)',
              border: '1px solid rgba(245,158,11,0.4)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Revoke
          </button>
        )}
        <button
          onClick={() => void handleDelete(token.id)}
          style={{
            padding: '5px 12px',
            background: 'transparent',
            color: 'var(--color-danger)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  ))}
</div>
```

Note: `IntegrationToken` type (from `api/integrations.ts`) uses camelCase: `createdAt`, `lastUsedAt`, `revoked: boolean`. There is no `token_prefix` field in the frontend type — it is not exposed by the API. The `CreatedToken` type extends `IntegrationToken` with a `token: string` field (the plaintext, shown once).

- [ ] **Step 4: Update the "Create Token" modal to show generated token**

In the create token modal (wherever it's currently defined), add a success state that shows the generated token in a monospace copy box after creation:

```tsx
{createdToken && (
  <div style={{ marginTop: 16 }}>
    <div style={{
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--color-success)',
      marginBottom: 8,
    }}>
      ✓ Token created. Copy it now — it won't be shown again.
    </div>
    <div style={{
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      padding: '10px 12px',
      background: 'var(--accent-subtle)',
      border: '1px solid var(--accent)',
      borderRadius: 'var(--radius-md)',
    }}>
      <code style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--accent)',
        flex: 1,
        wordBreak: 'break-all',
      }}>
        {createdToken}
      </code>
      <button
        onClick={() => void navigator.clipboard.writeText(createdToken)}
        style={{
          padding: '4px 10px',
          background: 'var(--accent)',
          color: 'var(--accent-fg)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Copy
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/pages/Integrations.tsx
git commit -m "feat: restyle Integrations with card list and improved token display"
```

---

## Task 9: Restyle Modal Components

**Files:**
- Modify: `packages/frontend/src/components/ImportIsoModal.tsx`
- Modify: `packages/frontend/src/components/ConfirmDialog.tsx`

- [ ] **Step 1: Update `ImportIsoModal.tsx` backdrop and panel**

Change the outer `<div>` backdrop:

```tsx
<div
  style={{
    position: 'fixed', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    overflowY: 'auto', padding: '64px 16px',
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(2px)',
  }}
  onClick={e => { if (e.target === e.currentTarget) onClose(); }}
>
```

Change the `<form>` panel:

```tsx
<form
  onSubmit={(e) => void handleSubmit(e)}
  style={{
    width: '100%', maxWidth: 520,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xl)',
    padding: '24px',
    animation: 'slideInUp 180ms ease-out',
  }}
>
```

- [ ] **Step 2: Update `ImportIsoModal` header text to Inter**

```tsx
<div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
  Import ISO
</div>
```

- [ ] **Step 3: Update `ImportIsoModal` label style and input style**

Replace the `labelStyle` and `inputStyle` constants:

```typescript
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: 34, padding: '0 10px',
  background: 'var(--bg-input)', border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-sans)', fontSize: 11,
  fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em',
  color: 'var(--text-muted)', marginBottom: 5,
};
```

- [ ] **Step 4: Update `ImportIsoModal` Submit and Cancel buttons**

```tsx
<button type="button" onClick={onClose} style={{
  padding: '7px 16px', background: 'transparent', color: 'var(--text-secondary)',
  border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer',
}}>
  Cancel
</button>
<button type="submit" disabled={saving} style={{
  padding: '7px 16px', background: 'var(--accent)', color: 'var(--accent-fg)',
  border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600,
  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
}}>
  {saving ? 'Importing…' : 'Import ISO'}
</button>
```

- [ ] **Step 5: Read and update `ConfirmDialog.tsx`**

```bash
cat packages/frontend/src/components/ConfirmDialog.tsx
```

Apply the same backdrop + `border-radius: var(--radius-xl)` + Inter font treatment to the ConfirmDialog modal panel.

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/components/ImportIsoModal.tsx packages/frontend/src/components/ConfirmDialog.tsx
git commit -m "feat: restyle ImportIsoModal and ConfirmDialog with new modal spec"
```

---

## Task 10: Restyle Notification and Toast Components

**Files:**
- Modify: `packages/frontend/src/components/NotificationCenter.tsx`
- Modify: `packages/frontend/src/components/ToastContainer.tsx`
- Modify: `packages/frontend/src/components/DownloadStatusBar.tsx`

- [ ] **Step 1: Update `ToastContainer.tsx` toast items**

Replace the toast `<div>` style:

```tsx
<div key={toast.id} style={{
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: '10px 14px',
  background: 'var(--bg-surface)',
  border: `1px solid ${borderColor[toast.type]}`,
  borderLeft: `3px solid ${borderColor[toast.type]}`,
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-md)',
  animation: 'slideInUp 140ms ease-out',
}}>
```

Update the message text to use `var(--font-sans)`:

```tsx
<span style={{
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  color: 'var(--text-primary)',
  flex: 1,
  lineHeight: 1.5,
}}>
  {toast.message}
</span>
```

- [ ] **Step 2: Update `NotificationCenter.tsx` panel animation**

The slide-in panel already uses `slideInRight`. Ensure the animation is defined in `index.css` (it is, from Task 2). Update the panel `border-radius`:

```tsx
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
```

Update the header text in the panel from monospace to Inter:

```tsx
<span style={{
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-primary)',
}}>
  Notifications
</span>
```

- [ ] **Step 3: Update `DownloadStatusBar.tsx`**

Update the label text to use `var(--font-sans)` and the progress bar to use `border-radius: 2px`:

```tsx
<span style={{
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--accent)',
}}>
  ↓ {activeCount} downloading
</span>
```

```tsx
{/* Progress bar */}
<div style={{ height: 3, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
```

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/components/NotificationCenter.tsx packages/frontend/src/components/ToastContainer.tsx packages/frontend/src/components/DownloadStatusBar.tsx
git commit -m "feat: restyle notification panel, toasts, and download status bar"
```

---

## Task 11: Restyle VersionTimeline

**Files:**
- Modify: `packages/frontend/src/components/VersionTimeline.tsx`

- [ ] **Step 1: Read current VersionTimeline.tsx**

```bash
cat packages/frontend/src/components/VersionTimeline.tsx
```

- [ ] **Step 2: Update timeline visual tokens**

Find the timeline dots, connecting lines, and card surfaces. Apply:
- Timeline dot (active/latest version): `background: var(--accent)` (indigo instead of old accent)
- Timeline dot (older versions): `background: var(--border-default)`
- Connecting vertical line: `background: var(--border-subtle)`
- Version card surface: `background: var(--bg-elevated)`, `border: 1px solid var(--border-default)`, `borderRadius: var(--radius-md)`
- Version string: `fontFamily: var(--font-mono)`, `fontSize: 13`, `fontWeight: 600`, `color: var(--text-primary)`
- Date/metadata: `fontFamily: var(--font-mono)`, `fontSize: 11`, `color: var(--text-muted)`

- [ ] **Step 3: Update action buttons in VersionTimeline**

Any download/delete/verify buttons should use the same secondary button style:

```tsx
<button style={{
  padding: '5px 10px',
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
}}>
```

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/components/VersionTimeline.tsx
git commit -m "feat: restyle VersionTimeline with new token system"
```

---

## Task 12: Fix LoginScreen Typography

**Files:**
- Modify: `packages/frontend/src/App.tsx` (LoginScreen component)

- [ ] **Step 1: Update `LoginScreen` to use Inter**

Replace the `LoginScreen` component's card and form elements:

```tsx
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
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          marginBottom: 4,
        }}>
          IsoVault
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          color: 'var(--text-secondary)',
          marginBottom: 24,
        }}>
          Enter your API key to continue
        </div>
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
              width: '100%', boxSizing: 'border-box', height: 38, padding: '0 12px',
              background: 'var(--bg-input)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none',
              marginBottom: 8,
            }}
          />
          {error && (
            <div style={{ marginBottom: 8, fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--color-danger)' }}>
              {error}
            </div>
          )}
          <button type="submit" style={{
            marginTop: 8, width: '100%', height: 38,
            background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)',
            color: 'var(--accent-fg)', fontFamily: 'var(--font-sans)', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
          }}>
            Connect
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/src/App.tsx
git commit -m "feat: restyle LoginScreen with Inter typography and rounded card"
```

---

## Task 13: Final Build Verification

- [ ] **Step 1: Run TypeScript type check**

```bash
cd packages/frontend && npx tsc --noEmit
```

Expected: no errors. If there are errors, fix them before proceeding.

- [ ] **Step 2: Run backend type check**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run the full test suite**

```bash
cd packages/backend && npm test
```

Expected: all tests pass (the backend tests should be unaffected by frontend changes).

- [ ] **Step 4: Build frontend production bundle**

```bash
cd packages/frontend && npm run build
```

Expected: build completes without errors.

- [ ] **Step 5: Visual verification checklist**

Open http://localhost:5173 and verify:

- [ ] Sidebar shows indigo→violet gradient header with "IsoVault" in white Inter and "ISO Management" subtitle
- [ ] Active nav item has indigo left border and indigo text on subtle indigo background
- [ ] Nav section labels ("LIBRARY", "SYSTEM") appear in monospace uppercase zinc-600
- [ ] Footer shows theme toggles (○ ◐ ●) and version in monospace zinc-600
- [ ] Dashboard stat cards have rounded corners (10px) and Inter labels with mono values
- [ ] Catalog table has no outer border, Inter headers, hover states on rows
- [ ] Modals open with blur backdrop, 16px rounded corners, slideInUp animation
- [ ] Toasts appear bottom-right with rounded corners
- [ ] Light mode toggle changes main content area (sidebar stays dark)
- [ ] No console errors

- [ ] **Step 6: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: final visual verification fixes"
```

---

## Self-Review Notes

- All API wiring, routing, state management, WebSocket downloads, and auth flow are untouched
- The `useTheme` hook in App.tsx stores preference in `localStorage` key `isovault_theme` — unchanged
- The `--bg-popup`, `--bg-highlight`, `--bg-hover` tokens from the old system are removed; any component referencing them will fall back to `initial` (effectively transparent/inherited). Search the codebase for these if components appear broken: `grep -r "bg-popup\|bg-highlight\|bg-hover" packages/frontend/src/`
- If `border-strong` is referenced somewhere not updated, it now maps to `#52525b` (zinc-600), which is a reasonable dark gray — no visual breakage expected
