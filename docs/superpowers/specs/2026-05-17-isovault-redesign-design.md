# IsoVault — Full Design System Rebuild
**Date:** 2026-05-17  
**Status:** Approved  
**Scope:** Frontend only — zero backend changes

---

## Overview

Complete visual redesign of IsoVault from the current Industrial Brutalist (acid-yellow monospace) aesthetic to a modern SaaS dark dashboard. The goal is something that feels immediately credible alongside tools like Linear, Supabase, and Vercel — polished, precise, and built for people who care about both aesthetics and function.

**Design decisions:**
- Direction: Zinc + Indigo (shadcn/ui dark foundation)
- Sidebar: Branded with gradient header + glow active states
- Typography: Inter for headings/body, monospace for values, labels, hashes
- Approach: Full design system rebuild (Approach 3)

---

## 1. Design Tokens

### CSS Custom Properties (`packages/frontend/src/index.css`)

All tokens live on `:root` (dark mode default) with a `[data-theme="light"]` override block.

#### Dark mode (default)
```css
--bg-base: #09090b;          /* zinc-950 — app background */
--bg-surface: #18181b;       /* zinc-900 — card surfaces */
--bg-elevated: #27272a;      /* zinc-800 — hover states, dropdowns */
--bg-input: #09090b;         /* input backgrounds */

--border-subtle: #27272a;    /* zinc-800 — dividers */
--border-default: #3f3f46;   /* zinc-700 — component borders */

--text-primary: #fafafa;     /* zinc-50 — headings */
--text-secondary: #a1a1aa;   /* zinc-400 — body text */
--text-muted: #71717a;       /* zinc-500 — captions, placeholders */
--text-disabled: #52525b;    /* zinc-600 — disabled states */

--accent: #6366f1;           /* indigo-500 — primary CTA, active states */
--accent-hover: #4f46e5;     /* indigo-600 — hover */
--accent-subtle: rgba(99,102,241,0.08);  /* tinted backgrounds */
--accent-fg: #ffffff;        /* text on accent backgrounds */

--color-success: #22c55e;    /* green-500 */
--color-danger: #ef4444;     /* red-500 */
--color-warning: #f59e0b;    /* amber-500 */
--color-success-subtle: rgba(34,197,94,0.12);
--color-danger-subtle: rgba(239,68,68,0.12);
--color-warning-subtle: rgba(245,158,11,0.12);

--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 10px;
--radius-xl: 16px;

--shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
--shadow-md: 0 4px 12px rgba(0,0,0,0.5);
--shadow-lg: 0 8px 32px rgba(0,0,0,0.6);

--sidebar-width: 220px;
--topbar-height: 48px;
```

#### Light mode override
```css
[data-theme="light"] {
  --bg-base: #f4f4f5;
  --bg-surface: #ffffff;
  --bg-elevated: #f4f4f5;
  --bg-input: #ffffff;
  --border-subtle: #e4e4e7;
  --border-default: #d4d4d8;
  --text-primary: #09090b;
  --text-secondary: #52525b;
  --text-muted: #71717a;
  --text-disabled: #a1a1aa;
  --accent: #4f46e5;        /* indigo-600 — darker for white bg contrast */
  --accent-hover: #4338ca;
  /* Sidebar stays dark in light mode (always zinc-900) */
}
```

System preference fallback via `@media (prefers-color-scheme: light)` when no `data-theme` attribute is set.

---

## 2. Typography System

### Font loading
```html
<!-- In index.html <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Font stacks
```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: ui-monospace, 'SF Mono', Menlo, 'Cascadia Code', monospace;
```

### Usage rules
- **Inter (sans):** page titles, section headings, body text, nav labels, button labels, form labels
- **Monospace:** version strings, file sizes, hashes, token prefixes, timestamps, table values, badge labels (family, arch), terminal-style captions

### Type scale
| Role | Size | Weight | Font | Letter-spacing |
|------|------|--------|------|---------------|
| Page title | 20px | 700 | Inter | -0.02em |
| Section heading | 15px | 600 | Inter | -0.01em |
| Body default | 13px | 400 | Inter | 0 |
| Body small | 12px | 400 | Inter | 0 |
| Label uppercase | 11px | 500 | Inter | +0.06em |
| Caption | 11px | 400 | Inter | 0 |
| Mono value | 13px | 600 | Mono | 0 |
| Mono label | 10px | 400 | Mono | +0.08em |
| Hero stat | 24px | 700 | Mono | -0.01em |

---

## 3. Sidebar & App Shell

### Sidebar structure
```
┌─────────────────────┐
│  GRADIENT HEADER    │  ← indigo→violet gradient, 64px tall
│  IsoVault           │    Inter 600 white + "ISO Management" caption
│  ISO Management     │    Bottom: 1px glow line rgba(99,102,241,0.6)
├─────────────────────┤
│  LIBRARY            │  ← section label: mono 9px zinc-600 uppercase
│  ▸ Catalog          │  ← active: accent bg + 3px left border + accent text
│    Downloads        │  ← inactive: zinc-500 text
│    Watchers         │
├─────────────────────┤
│  SYSTEM             │  ← section label
│    Integrations     │
│    Settings         │
│    Audit Log        │
├─────────────────────┤
│  ◐  v0.x.x          │  ← theme toggle + version tag (footer strip)
└─────────────────────┘
```

**Nav item spec:**
- Height: 34px, padding: `0 12px`, gap: 10px between icon and label
- Active: `background: var(--accent-subtle)`, `border-left: 3px solid var(--accent)`, icon + label in `var(--accent)`
- Inactive: zinc-500 text, no background, icon in zinc-600
- Hover: `background: var(--bg-elevated)`, zinc-300 text
- Transition: 80ms background

**Footer strip:**
- `background: #09090b` (zinc-950), `border-top: 1px solid var(--border-subtle)`
- Theme toggle: three 24×24 ghost buttons — `○` (light), `◐` (system), `●` (dark) — active one gets accent color
- Version: mono 10px zinc-600, right-aligned

### Topbar
- Height: 48px, `background: var(--bg-base)`, `border-bottom: 1px solid var(--border-subtle)`, sticky
- Left: page title (Inter 600, 15px, zinc-50)
- Right: action buttons + notification bell

### Main content
- `margin-left: var(--sidebar-width)`, `padding-top: var(--topbar-height)`
- Page body: `padding: 24px 28px`
- Page title zone: title (Inter 700, 20px) + subtitle (Inter 400, 13px, zinc-400), `margin-bottom: 24px`

---

## 4. Component Library

### Cards
```
background: var(--bg-surface)         /* zinc-900 */
border: 1px solid var(--border-default)
border-radius: var(--radius-lg)       /* 10px */
padding: 16px 20px
```

**Stat card variant:**
- Value: monospace 24px 700, white or indigo
- Label: Inter 11px 500, zinc-500, uppercase, letter-spacing 0.06em

### Badges / Pills
Shape: `border-radius: 9999px`, `padding: 2px 8px`, Inter 500 11px

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| success | green-500/12% | green-400 | green-500/25% |
| danger | red-500/12% | red-400 | red-500/25% |
| warning | amber-500/12% | amber-400 | amber-500/25% |
| info | indigo-500/12% | indigo-400 | indigo-500/25% |
| neutral | zinc-800 | zinc-400 | zinc-700 |

Family/arch tags: same shape, 10px, zinc-700 bg, zinc-300 text.

### Buttons
| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| primary | `--accent` | white | none |
| secondary | transparent | zinc-300 | `--border-default` |
| destructive | transparent | red-400 | red-500/40% |
| ghost | transparent | zinc-400 | none |

All: Inter 600 13px, `border-radius: var(--radius-md)`, `padding: 7px 16px`.  
Hover: primary → `--accent-hover`, others → `--bg-elevated`.  
Active: `transform: scale(0.98)`.

### Inputs / Forms
```
height: 34px
padding: 0 10px
background: var(--bg-input)
border: 1px solid var(--border-default)
border-radius: var(--radius-sm)       /* 4px */
font: Inter 13px zinc-100
focus: border-color var(--accent), box-shadow 0 0 0 3px var(--accent-subtle)
```

Labels: Inter 500, 11px, zinc-400, uppercase, letter-spacing 0.06em, `margin-bottom: 5px`.

### Tables
- No outer border — flush in page body
- Header: Inter 500 11px zinc-500 uppercase, sticky, `border-bottom: 1px solid var(--border-default)`
- Rows: 44px min-height, `border-bottom: 1px solid var(--border-subtle)`, hover: zinc-900 tint
- Action buttons: hidden until row hover (opacity 0→1, 80ms)

### Modals
- Backdrop: `rgba(0,0,0,0.75)` + `backdrop-filter: blur(2px)`
- Panel: zinc-900, `border: 1px solid var(--border-default)`, `border-radius: var(--radius-xl)`, max-width 520px
- Entry: `translateY(8px) opacity(0) → natural`, 180ms ease-out
- Header: Inter 600 15px + ✕ ghost button
- Footer: right-aligned buttons, `border-top: 1px solid var(--border-subtle)`

---

## 5. Page Treatments

### Catalog
- Filter bar above table: search input (flex 1) + family dropdown + arch dropdown + status filter pills
- Table columns: Name + family tag | Architecture | Latest version | File size | Status badge | Actions
- Empty state: centered zinc-600 mono "No ISOs found" + primary Import button
- Import ISO: opens `ImportIsoModal` — restyled to match new modal spec

### Downloads
- Same table pattern as Catalog
- Active download rows: inline progress bar (indigo fill, animated) in a dedicated column
- Status column: `downloading` / `queued` / `complete` / `failed` badges

### Watchers
- Table with columns: Definition | Schedule (monospace cron pill) | Last checked | Next check | Status

### Settings
- Two-column layout: 140px nav list (left) + content panel (right)
- Nav sections: General | Storage | Authentication | Advanced
- Each section uses card container with form fields inside

### Integrations
- Token list as cards (not table) — one card per token
- Card shows: name (Inter 600), prefix (mono zinc-400), created date (mono zinc-500), status badge
- Revoked tokens: entire card dims to 50% opacity + "Revoked" badge
- "Create Token" button → modal with generated token shown once in a monospace copy-to-clipboard box with indigo highlight

### Version Timeline
- Existing drawer/modal structure preserved
- Restyled: timeline dots use `--accent`, connecting line uses `--border-default`, card surfaces use `--bg-surface`

### Audit Log
- Full-width table, monospace timestamps, action + actor columns
- Same table pattern as Catalog/Downloads — no page-specific deviations

---

## 6. Motion

| Element | Animation | Duration |
|---------|-----------|----------|
| Modal entry | translateY(8px)→0 + opacity 0→1 | 180ms ease-out |
| Notification panel | translateX(100%)→0 | 150ms ease-out |
| Toast | translateY(8px)→0 + opacity 0→1 | 140ms ease-out |
| Row hover | background | 80ms |
| Nav item hover | background | 80ms |
| Button hover | background | 100ms |
| Theme switch | all colors | 200ms |
| Sidebar gradient | static (no animation) | — |

`@media (prefers-reduced-motion: reduce)`: all durations set to 0ms.

---

## 7. Light Mode

Sidebar **always stays dark** (zinc-900) regardless of theme — same approach as Linear. Only the main content area switches.

Theme persists to `localStorage` key `isovault-theme`. Values: `'dark'` | `'light'` | `'system'`. `'system'` reads `prefers-color-scheme` at runtime.

---

## 8. Files to Change

| File | Change |
|------|--------|
| `packages/frontend/index.html` | Add Inter font link |
| `packages/frontend/src/index.css` | Full rewrite — new token system, base styles, animations |
| `packages/frontend/src/App.tsx` | New sidebar (branded gradient header, section labels, footer), topbar, theme hook |
| `packages/frontend/src/pages/Catalog.tsx` | Filter bar, restyled table, empty state |
| `packages/frontend/src/pages/Downloads.tsx` | Restyled table + progress bars |
| `packages/frontend/src/pages/Watchers.tsx` | Restyled table |
| `packages/frontend/src/pages/Settings.tsx` | Two-column layout, form restyling |
| `packages/frontend/src/pages/Integrations.tsx` | Card list, create token modal |
| `packages/frontend/src/components/ImportIsoModal.tsx` | New modal spec |
| `packages/frontend/src/components/NotificationCenter.tsx` | Panel restyling |
| `packages/frontend/src/components/VersionTimeline.tsx` | Timeline restyling |
| `packages/frontend/src/components/DownloadStatusBar.tsx` | Progress bar restyling |
| `packages/frontend/src/components/ToastContainer.tsx` | Toast restyling |

**No backend changes.**

---

## 9. Out of Scope

- Responsive/mobile layout (sidebar collapse) — future iteration
- Animations on route changes
- Custom icon library (continue using inline SVGs)
- Component extraction to a shared UI package
