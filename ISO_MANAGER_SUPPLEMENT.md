# HomeLab ISO Manager — Architecture Supplement

**Addendum to:** `ISO_MANAGER_ARCHITECTURE.md v1.0.0`  
**This Document:** UX/UI Design System · Error Handling & Logging · End-to-End Testing  
**Version:** 1.1.0  

---

## Table of Contents

1. [UX/UI Design System](#1-uxui-design-system)
   - 1.1 Design Philosophy
   - 1.2 Color Tokens (Light & Dark)
   - 1.3 Typography Scale
   - 1.4 Spacing & Radius System
   - 1.5 Component Library
   - 1.6 Page-by-Page UX Spec
   - 1.7 Responsive Behavior
   - 1.8 Accessibility Requirements
   - 1.9 Motion & Animation
2. [Error Handling & Logging Architecture](#2-error-handling--logging-architecture)
   - 2.1 Error Classification Taxonomy
   - 2.2 Error Object Schema
   - 2.3 Structured Log Schema
   - 2.4 Log Levels & When to Use Each
   - 2.5 Component-Level Error Handling Patterns
   - 2.6 User-Facing Error Messages
   - 2.7 Log Storage, Retention & Rotation
   - 2.8 Log Viewer UI Spec
   - 2.9 Alerting & Escalation
3. [End-to-End Testing Strategy](#3-end-to-end-testing-strategy)
   - 3.1 Testing Philosophy
   - 3.2 Tool Stack
   - 3.3 Test Environment Setup
   - 3.4 Test Scenarios (Full Matrix)
   - 3.5 Playwright Test Structure & Conventions
   - 3.6 Visual Regression Testing
   - 3.7 Accessibility Testing
   - 3.8 Performance & Load Testing
   - 3.9 CI/CD Integration

---

## 1. UX/UI Design System

### 1.1 Design Philosophy

The ISO Manager UI is built on one core principle: **operational calm**. Homelab users often interact with this tool at odd hours, in low-light environments, while managing multiple concurrent systems. The interface should:

- Feel like a professional tool, not a toy. Reference points: Linear, Vercel Dashboard, Grafana.
- Default to **dark mode** — it's the expected mode for infrastructure tooling.
- Never startle. Animations are subtle, transitions are short, colors don't fight each other.
- Surface the most important state upfront. A user should understand what their ISO inventory looks like in under 3 seconds from page load.
- Make destructive actions (deletes, overwrites) require an explicit, unambiguous confirmation — never one accidental click away.

**What to avoid:**
- Aggressive coloration (a sea of red alerts for non-critical events)
- Information overload (too many stats on one screen)
- Overly nested navigation (max 2 levels)
- Modal-heavy workflows (prefer inline expand/edit where possible)

---

### 1.2 Color Tokens (Light & Dark)

The app uses a CSS custom property system. **Dark mode is the default**; light mode is toggled via a class on `<html>`.

```css
/* ============================================
   DARK MODE (default) — :root
   ============================================ */
:root {
  /* Backgrounds — layered surface hierarchy */
  --bg-base:        #0f1117;   /* page background */
  --bg-surface:     #161b27;   /* sidebar, cards */
  --bg-elevated:    #1e2537;   /* hover states, inputs */
  --bg-popup:       #252e42;   /* dropdowns, tooltips */
  --bg-highlight:   #2d3650;   /* selected rows */

  /* Borders */
  --border-subtle:  rgba(255,255,255,0.06);
  --border-default: rgba(255,255,255,0.10);
  --border-strong:  rgba(255,255,255,0.18);

  /* Text */
  --text-primary:   #e8eaf0;
  --text-secondary: #8b92a8;
  --text-muted:     #545d75;
  --text-disabled:  #384060;

  /* Brand accent */
  --accent:         #5b7cf6;
  --accent-hover:   #3d5bd4;
  --accent-subtle:  rgba(91,124,246,0.12);

  /* Semantic */
  --color-success:        #2dd4a0;
  --color-success-subtle: rgba(45,212,160,0.10);
  --color-warning:        #f5a623;
  --color-warning-subtle: rgba(245,166,35,0.12);
  --color-danger:         #f04b4b;
  --color-danger-subtle:  rgba(240,75,75,0.10);
  --color-info:           #5b7cf6;
  --color-info-subtle:    rgba(91,124,246,0.10);
  --color-purple:         #a78bfa;
  --color-purple-subtle:  rgba(167,139,250,0.10);

  /* Status badge colors (ISO status) */
  --status-active:    #2dd4a0;  /* active ISOs */
  --status-download:  #5b7cf6;  /* downloading */
  --status-archive:   #545d75;  /* archived */
  --status-corrupt:   #f04b4b;  /* corrupt/failed */
  --status-pending:   #f5a623;  /* queued/pending */

  /* Component tokens */
  --radius-sm:   6px;
  --radius-md:   8px;
  --radius-lg:  10px;
  --radius-xl:  14px;

  --shadow-sm:  0 1px 3px rgba(0,0,0,0.3);
  --shadow-md:  0 4px 12px rgba(0,0,0,0.4);
}

/* ============================================
   LIGHT MODE — html.light :root
   ============================================ */
html.light {
  --bg-base:        #f4f5f7;
  --bg-surface:     #ffffff;
  --bg-elevated:    #f0f1f5;
  --bg-popup:       #ffffff;
  --bg-highlight:   #eef0ff;

  --border-subtle:  rgba(0,0,0,0.05);
  --border-default: rgba(0,0,0,0.10);
  --border-strong:  rgba(0,0,0,0.18);

  --text-primary:   #111827;
  --text-secondary: #4b5563;
  --text-muted:     #9ca3af;
  --text-disabled:  #d1d5db;

  --accent:         #4361d8;
  --accent-hover:   #2f4fba;
  --accent-subtle:  rgba(67,97,216,0.08);

  --color-success:        #0d9e74;
  --color-success-subtle: rgba(13,158,116,0.08);
  --color-warning:        #d48a0f;
  --color-warning-subtle: rgba(212,138,15,0.10);
  --color-danger:         #dc2626;
  --color-danger-subtle:  rgba(220,38,38,0.08);
}
```

---

### 1.3 Typography Scale

```css
/* Base: Inter or system-ui fallback. Load via Google Fonts or self-host. */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Scale */
--text-xs:   11px / 1.5;   /* metadata, timestamps, labels */
--text-sm:   12px / 1.6;   /* table cells, secondary info */
--text-base: 13px / 1.6;   /* body, nav items */
--text-md:   15px / 1.5;   /* page titles, card headings */
--text-lg:   18px / 1.4;   /* section headers */
--text-stat: 24px / 1.2;   /* stat card numbers (500 weight) */

/* Weights */
--weight-regular: 400;
--weight-medium:  500;

/* Mono (logs, checksums, paths) */
font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
font-size: 12px;
```

---

### 1.4 Spacing & Radius System

Use an 8px base grid. All margins, paddings, and gaps should be multiples of 4px or 8px.

```
4px   — icon-text gaps, badge padding
8px   — compact component padding
12px  — card internal gap
16px  — card padding, section gap
20px  — page content padding
24px  — section-to-section spacing
32px  — major layout spacing

Radius:
  sm (6px)  — badges, chips, small buttons
  md (8px)  — inputs, nav items, small cards
  lg (10px) — standard cards, panels
  xl (14px) — modals, drawers
```

---

### 1.5 Component Library

Claude Code should build these as React components in `frontend/src/components/`:

#### StatusBadge
```tsx
// Props: status: 'active' | 'downloading' | 'archived' | 'corrupt' | 'pending' | 'queued'
// Renders a pill badge with appropriate color and icon

<StatusBadge status="active" />     // ● Active (green)
<StatusBadge status="downloading" /> // ↓ Downloading (blue, animated dot)
<StatusBadge status="archived" />    // Archive (muted gray)
<StatusBadge status="corrupt" />     // ✕ Corrupt (red)
<StatusBadge status="pending" />     // ◌ Queued (amber)
```

#### DownloadProgressBar
```tsx
// Props: percent: number, speedBps: number, etaSeconds: number, status: string
// Full-width bar with speed/ETA display, cancel button
// Shows retrying state with attempt count
// Animates smooth fill — not jumpy

<DownloadProgressBar
  percent={73}
  speedBps={48_300_000}
  etaSeconds={18}
  status="downloading"
  onCancel={() => {}}
/>
```

#### ChecksumBadge
```tsx
// Props: verified: boolean | null, algorithm: string, value?: string
// null = not yet verified (pending)
// Click to copy full checksum value

<ChecksumBadge verified={true} algorithm="sha256" value="a3b4c5..." />
// Renders: SHA256 ✓ [copy icon]
```

#### VersionTimeline
```tsx
// Props: versions: IsoVersion[]
// Vertical list of version entries, newest first
// Each entry: version string | date | size | status badge | action buttons
// Highlight active versions; gray out archived

<VersionTimeline versions={[...]} definitionId="uuid" />
```

#### RetentionPolicyForm
```tsx
// Props: value: RetentionPolicy, onChange: (p: RetentionPolicy) => void
// Two fields: count (number input 1-50), behavior (select: archive | delete)
// Inline preview: "Keep 5 latest. Anything over goes to archive."

<RetentionPolicyForm
  value={{ count: 5, behavior: 'archive' }}
  onChange={setPolicy}
/>
```

#### WatchStrategyForm
```tsx
// Props: strategy: WatchStrategy, config: WatchConfig, onChange
// Renders strategy-specific fields based on selected strategy
// Live validation with test-now button that shows preview result

<WatchStrategyForm
  strategy="html_scrape"
  config={{ url: '...', selector: '...', regex: '...' }}
  onChange={setWatch}
/>
```

#### StorageUsageRing
```tsx
// Props: totalBytes, activeBytes, archiveBytes, pendingBytes
// Donut chart using CSS conic-gradient (no chart library dependency for this)
// Legend: Active (blue) | Archive (gray) | Pending (amber) | Free (surface)

<StorageUsageRing
  totalBytes={2_000_000_000_000}
  activeBytes={812_000_000_000}
  archiveBytes={412_000_000_000}
  pendingBytes={18_000_000_000}
/>
```

#### ConfirmDialog
```tsx
// Props: title, description, confirmLabel, variant: 'danger' | 'warning', onConfirm, onCancel
// Centered modal overlay — for destructive actions ONLY
// Requires typing a confirmation phrase for permanent deletes (pattern: Proxmox/GitHub style)

<ConfirmDialog
  title="Permanently delete this ISO?"
  description="This cannot be undone. The file will be removed from disk."
  confirmLabel="Delete permanently"
  variant="danger"
  requirePhrase="delete"         // user must type "delete" to enable button
  onConfirm={handleDelete}
  onCancel={closeDialog}
/>
```

---

### 1.6 Page-by-Page UX Spec

#### Dashboard (`/`)

**Layout:** Top stat bar → 2-column below (downloads left 60%, log right 40%)

**Stat bar (4 cards):**
- Total Active ISOs — count + change indicator (e.g., "↑2 this week")
- Downloading — count of active jobs + aggregate speed
- Archived — count + total disk usage
- Watch Alerts — count of unread new-version notifications (amber if > 0)

**Active Downloads panel:**
- One card per active job. Sorted by: running first, then queued by priority.
- Each card: OS icon color + name + filename + progress bar + speed + ETA + cancel button
- Empty state: "No active downloads. Add an ISO or trigger a check." with CTA button.

**Live Log panel:**
- Newest 25 audit events, streaming via WebSocket
- Columns: timestamp | level pill | message
- Level pill colors: INFO=blue, OK=green, WARN=amber, ERROR=red
- Click any row → navigates to `/audit` with that event pre-selected
- Auto-scroll to bottom unless user has scrolled up (detect scroll position)

---

#### ISO Catalog (`/catalog`)

**Layout:** Toolbar → filter chips → table

**Toolbar:** Search input (debounced 300ms) | Family dropdown | Tag multi-select | Status filter | "+ Add ISO" button

**Filter chips (applied filters shown as removable chips below toolbar)**

**Table columns:** Name + OS dot | Family | Latest Version | Architecture | Size | Status | Watch indicator | Actions (⋯ menu)

**Row expand (click row):** Opens inline panel below with:
- Version timeline (latest 5, "show all" link)
- Watch configuration summary
- Retention policy summary
- Quick actions: Download Latest | Edit | Manage Retention

**"+ Add ISO" modal — tabbed:**
- Tab 1: Basic Info (name, family, description, architecture, tags)
- Tab 2: Source & Checksum (download URL, checksum URL, algorithm)
- Tab 3: Retention Policy (count + behavior)
- Tab 4: Watch Config (enable toggle → strategy selector → dynamic form fields → "Test Now" button)

---

#### Downloads (`/downloads`)

**Layout:** Tabs (Active | Queued | History) → job list

**Active tab:**
- Sorted: running first, then queued
- Each job: expandable card with full progress detail, log snippet, cancel/pause button

**Queued tab:**
- List view with drag-handle for manual reorder (priority)
- Each row: name | size estimate | queued at | priority badge | "Start Now" button | cancel

**History tab:**
- Filterable by: date range, status (completed, failed, cancelled)
- Sortable by: date, duration, size
- Failed jobs show: error reason + "Retry" button
- Download completed shows: duration + checksum result badge

---

#### Version History (`/catalog/:id/versions`)

**Layout:** Back breadcrumb | Definition header | Timeline

**Definition header:** Name | Family | Architecture | Watch status | Retention policy chip | "Download Latest" CTA

**Timeline:**
- Vertical list, newest at top
- Each entry is a card: version number (large) | release date | filename | file size | checksum badge | status badge | "Archive" / "Restore" / "Delete" action buttons
- Active versions: full opacity, left border accent in --accent color
- Archived versions: 60% opacity, left border accent in --text-muted
- Corrupt versions: red left border, error icon

---

#### Watchers (`/watchers`)

**Layout:** Table of all watch-enabled definitions

**Columns:** Name | Strategy | Interval | Last Checked | Last Found Version | Status | Actions

**Status column states:**
- Active (green dot) — running normally
- New version detected (amber pulse dot) — with "Download" CTA inline
- Error (red dot) — last check failed; shows error reason on hover/expand
- Paused (gray dot) — manually paused

**Row expand:** Shows watch config details + recent check history (last 5 check results)

**"Test Now" button per row:** Runs an immediate check, shows result inline in a toast

---

#### Archive (`/archive`)

**Layout:** Grouped by family → accordion → version list inside

**Each version entry:** filename | archived date | size | checksum badge | "Restore to Active" button | "Delete Permanently" button

**Bulk actions bar (appears when rows selected):**
- "Restore selected" | "Delete selected" | "Clear selection"
- Storage reclaim preview: "Deleting 3 ISOs will free 4.2 GB"

---

#### Audit Log (`/audit`)

**Layout:** Filter bar → log stream table

**Filters:** Event type multi-select | Severity (info/warn/error) | Entity (ISO name search) | Date range picker

**Table columns:** Time | Level | Event | ISO Name | Details (expandable)

**"Details" expand:** JSON payload in a code block with syntax highlighting

**Export button:** Downloads filtered log as NDJSON or CSV

---

#### Settings (`/settings`)

**Layout:** Left sub-nav (sections) → right form panel

**Sections:**
1. **General** — storage path, concurrent downloads, log retention days, storage alert threshold
2. **API Access** — show/rotate API key, copy button, key creation timestamp
3. **Webhooks** — list of configured webhooks with enable toggles; add/edit/delete; "Send Test" button
4. **Notifications** — global auto-download behavior default, email (future)
5. **About** — version, uptime, Node.js version, SQLite path, "Check for app updates" (links to releases page)

---

### 1.7 Responsive Behavior

The app is primarily a desktop tool, but should not break on tablets:

```
Desktop (≥1280px): Full sidebar + main split as designed
Tablet (768–1279px): Sidebar collapses to icon-only (48px), expand on hover
Mobile (<768px): Sidebar becomes bottom tab bar (5 icons); content scrolls
```

The download page in particular should remain usable on a phone — users may check status from their phone while a long download runs.

---

### 1.8 Accessibility Requirements

- All interactive elements have visible focus indicators (2px solid `--accent` ring)
- ARIA labels on icon-only buttons (`aria-label="Cancel download"`)
- Status badges use both color and text/icon — never color alone
- Keyboard navigation: Tab order follows visual left-to-right, top-to-bottom
- Log table uses `role="log"` with `aria-live="polite"` for streaming entries
- Destructive confirm dialogs trap focus while open
- Color contrast: minimum 4.5:1 for body text, 3:1 for large text (WCAG AA)

---

### 1.9 Motion & Animation

Keep motion subtle and purposeful. Honor `prefers-reduced-motion`.

```css
@media (prefers-reduced-motion: no-preference) {
  /* Download progress bar: smooth fill update */
  .progress-fill { transition: width 250ms ease-out; }

  /* Status badge: live watch indicator pulses */
  .watch-dot-live { animation: pulse 2s ease-in-out infinite; }

  /* Toast notifications: slide in from top-right */
  .toast { animation: slideIn 200ms ease-out; }

  /* Page transitions: simple fade */
  .page { animation: fadeIn 120ms ease; }

  /* Sidebar collapse: smooth width transition */
  .sidebar { transition: width 200ms ease; }
}

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
@keyframes slideIn { from{transform:translateX(16px);opacity:0} to{transform:translateX(0);opacity:1} }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
```

**No loading spinners for operations < 300ms.** Use skeleton placeholders for initial page loads. Progress bars (not spinners) for downloads.

---

## 2. Error Handling & Logging Architecture

### 2.1 Error Classification Taxonomy

Every error in the system has a class, a severity, and a user impact level. These drive how the error is: (a) logged, (b) surfaced to the UI, (c) retried, (d) alerted.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ERROR TAXONOMY                                     │
├──────────────────────┬───────────┬───────────┬──────────────────────────┤
│ Class                │ Severity  │ Retry?    │ Examples                 │
├──────────────────────┼───────────┼───────────┼──────────────────────────┤
│ ValidationError      │ WARN      │ No        │ Bad URL, missing field   │
│ AuthError            │ WARN      │ No        │ Invalid API key          │
│ NotFoundError        │ INFO      │ No        │ ISO/job ID not found     │
│ ConflictError        │ WARN      │ No        │ Duplicate version        │
│ NetworkError         │ ERROR     │ Yes (3x)  │ DNS failure, timeout     │
│ DownloadError        │ ERROR     │ Yes (3x)  │ Partial download, 5xx    │
│ ChecksumMismatch     │ ERROR     │ Once      │ Hash doesn't match       │
│ StorageError         │ CRITICAL  │ No        │ Disk full, permission    │
│ WatcherError         │ WARN      │ Yes (2x)  │ Scrape fail, parse fail  │
│ IntegrityError       │ ERROR     │ No        │ File corrupted on verify │
│ DatabaseError        │ CRITICAL  │ No        │ SQLite locked, corrupt   │
│ ConfigurationError   │ CRITICAL  │ No        │ Bad config.yaml          │
│ WebhookDeliveryError │ WARN      │ Yes (3x)  │ Endpoint unreachable     │
└──────────────────────┴───────────┴───────────┴──────────────────────────┘
```

---

### 2.2 Error Object Schema

All errors extend a base class:

```typescript
// src/errors/base.ts

export class IsoManagerError extends Error {
  public readonly code: string;         // Machine-readable: "DOWNLOAD_NETWORK_TIMEOUT"
  public readonly statusCode: number;   // HTTP status for API responses
  public readonly severity: 'info' | 'warn' | 'error' | 'critical';
  public readonly retryable: boolean;
  public readonly context: Record<string, unknown>; // Structured debug data
  public readonly timestamp: Date;
  public readonly requestId?: string;   // Traces request through logs

  constructor(params: {
    message: string;
    code: string;
    statusCode?: number;
    severity?: IsoManagerError['severity'];
    retryable?: boolean;
    context?: Record<string, unknown>;
    requestId?: string;
    cause?: Error;  // Wrap original error (supports ES2022 Error.cause)
  }) { ... }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      context: this.sanitizeContext(this.context), // strips api_key, secrets
      timestamp: this.timestamp.toISOString(),
      ...(this.cause ? { cause: (this.cause as Error).message } : {}),
    };
  }
}

// Subclasses
export class ValidationError extends IsoManagerError {
  constructor(message: string, field?: string, value?: unknown) {
    super({ message, code: 'VALIDATION_ERROR', statusCode: 400, severity: 'warn',
            retryable: false, context: { field, value } });
  }
}

export class DownloadError extends IsoManagerError {
  constructor(message: string, url: string, attempt: number, cause?: Error) {
    super({ message, code: 'DOWNLOAD_FAILED', statusCode: 500, severity: 'error',
            retryable: attempt < 3, context: { url, attempt }, cause });
  }
}

export class ChecksumMismatchError extends IsoManagerError {
  constructor(expected: string, actual: string, filePath: string) {
    super({ message: `Checksum mismatch: expected ${expected.slice(0,8)}… got ${actual.slice(0,8)}…`,
            code: 'CHECKSUM_MISMATCH', statusCode: 500, severity: 'error',
            retryable: true,  // retry the download once to rule out corruption in transit
            context: { expected, actual, filePath } });
  }
}

export class StorageError extends IsoManagerError {
  constructor(message: string, path: string, cause?: Error) {
    super({ message, code: 'STORAGE_ERROR', statusCode: 500, severity: 'critical',
            retryable: false, context: { path }, cause });
  }
}
```

---

### 2.3 Structured Log Schema

Every log line is a JSON object. This enables filtering, searching, and shipping to external systems later if desired.

```typescript
// All logs must conform to this shape
interface LogEntry {
  // Core
  level:      'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message:    string;
  timestamp:  string;   // ISO 8601 UTC
  
  // Request tracing
  requestId?: string;   // UUID tied to HTTP request lifecycle
  jobId?:     string;   // Download job UUID if in job context
  
  // Error fields (present only on error/fatal)
  err?: {
    code:     string;
    message:  string;
    stack?:   string;   // stack omitted in production logs to reduce size
    context?: Record<string, unknown>;
  };
  
  // Domain context (include whatever is relevant)
  definitionId?:  string;
  versionId?:     string;
  eventType?:     string;   // matches audit_log.event_type
  filePath?:      string;
  url?:           string;   // sanitized — no credentials in URL
  bytesTotal?:    number;
  bytesDone?:     number;
  durationMs?:    number;
  
  // App metadata
  service:  'iso-manager';
  version:  string;   // app semver
  pid:      number;
  hostname: string;
}
```

**Example log line (pretty-printed for readability; actual output is single-line JSON):**
```json
{
  "level": "error",
  "message": "Checksum verification failed after download",
  "timestamp": "2026-05-13T14:23:41.882Z",
  "requestId": null,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "err": {
    "code": "CHECKSUM_MISMATCH",
    "message": "expected a3b4c5… got f0e1d2…",
    "context": {
      "expected": "a3b4c5d6...",
      "actual": "f0e1d2e3...",
      "filePath": "/data/iso-store/downloads/550e8400.part"
    }
  },
  "definitionId": "abc123",
  "versionId": "def456",
  "url": "https://releases.ubuntu.com/24.04.2/ubuntu-server-24.04.2-amd64.iso",
  "bytesTotal": 1572864000,
  "durationMs": 43210,
  "service": "iso-manager",
  "version": "1.0.0",
  "pid": 1234,
  "hostname": "homelab-vm"
}
```

---

### 2.4 Log Levels & When to Use Each

| Level | When to use | Examples |
|---|---|---|
| `debug` | Dev & troubleshooting only. Never in production by default. | HTTP request headers, SQLite query plan, watcher raw HTML |
| `info` | Normal operational events. The story of what the app is doing. | Download started, version check completed, retention applied |
| `warn` | Something unexpected happened but the system recovered. | Download retry 1/3, watcher parse warning, storage > 80% |
| `error` | An operation failed. Needs attention but system is still running. | Checksum mismatch, download failed all retries, webhook failure |
| `fatal` | System cannot continue. App will exit or be degraded. | SQLite unrecoverable error, storage path unmounted, config invalid |

**Rule:** `error` and `fatal` ALWAYS include a structured `err` object. `warn` should include one if there's a caught exception. `info` and `debug` never include stack traces.

---

### 2.5 Component-Level Error Handling Patterns

#### Download Worker (most complex error path)

```typescript
// src/workers/DownloadWorker.ts

async function downloadFile(job: DownloadJob): Promise<void> {
  const log = logger.child({ jobId: job.id, definitionId: job.definitionId });

  // --- Phase 1: Initiate download ---
  let response: Response;
  try {
    response = await fetchWithRetry(job.sourceUrl, {
      maxRetries: 0,        // retries managed at job level
      timeout: 3_600_000,   // 1 hour
      validateContentType: true,
      ssrfCheck: true,
    });
    log.info({ url: job.sourceUrl }, 'download.initiated');
  } catch (err) {
    const wrappedErr = new DownloadError('Failed to initiate download', job.sourceUrl, job.attemptCount, err as Error);
    log.error({ err: wrappedErr.toJSON() }, 'download.init_failed');
    await markJobFailed(job.id, wrappedErr);
    throw wrappedErr;
  }

  // --- Phase 2: Stream to .part file ---
  const partPath = StorageService.getPartPath(job.id);
  try {
    await streamToDisk(response.body, partPath, {
      onProgress: (bytes, total) => {
        reportProgress(job.id, bytes, total);
        log.debug({ bytesDone: bytes, bytesTotal: total }, 'download.progress');
      }
    });
    log.info({ filePath: partPath, bytesTotal: response.headers.get('content-length') }, 'download.streamed');
  } catch (err) {
    // Clean up partial file
    await safeDeleteFile(partPath);
    const wrappedErr = new DownloadError('Stream interrupted', job.sourceUrl, job.attemptCount, err as Error);
    log.error({ err: wrappedErr.toJSON(), filePath: partPath }, 'download.stream_failed');
    await markJobFailed(job.id, wrappedErr);
    throw wrappedErr;
  }

  // --- Phase 3: Checksum verification ---
  try {
    const actual = await computeChecksum(partPath, job.checksumAlgorithm);
    if (actual !== job.expectedChecksum) {
      await safeDeleteFile(partPath);
      throw new ChecksumMismatchError(job.expectedChecksum, actual, partPath);
    }
    log.info({ algorithm: job.checksumAlgorithm }, 'download.checksum_verified');
  } catch (err) {
    if (err instanceof ChecksumMismatchError) {
      log.error({ err: (err as IsoManagerError).toJSON() }, 'download.checksum_failed');
      await markVersionCorrupt(job.versionId, err as ChecksumMismatchError);
      await AuditService.log('integrity.failed', 'iso_version', job.versionId, { ...err.context });
      // Fire webhook
      await NotificationService.fire('integrity.failed', { versionId: job.versionId });
    }
    throw err;
  }

  // --- Phase 4: Move to active store ---
  try {
    const finalPath = StorageService.getActivePath(job.definitionFamily, job.versionString, job.filename);
    await StorageService.moveFile(partPath, finalPath);
    await markVersionActive(job.versionId, finalPath);
    log.info({ filePath: finalPath }, 'download.completed');
    await AuditService.log('download.completed', 'iso_version', job.versionId, {
      durationMs: Date.now() - job.startedAt,
      filePath: finalPath,
    });
  } catch (err) {
    const wrappedErr = new StorageError('Failed to move completed download to active store', partPath, err as Error);
    log.error({ err: wrappedErr.toJSON() }, 'download.move_failed');
    // CRITICAL: notify — ISO downloaded but can't be activated
    await NotificationService.fire('download.move_failed', { jobId: job.id });
    throw wrappedErr;
  }
}
```

#### Watcher Error Handling

```typescript
// Watcher errors should NOT crash the scheduler — they must be caught and logged per-definition

async function runWatcherSafely(definition: IsoDefinition): Promise<void> {
  const log = logger.child({ definitionId: definition.id, strategy: definition.watchStrategy });
  const startedAt = Date.now();

  try {
    log.info('watcher.check_started');
    const result = await WatcherFactory.create(definition).detectLatestVersion();

    await db.updateWatchLastChecked(definition.id, {
      checkedAt: new Date(),
      versionFound: result.version,
      status: 'ok',
    });
    log.info({ versionFound: result.version, durationMs: Date.now() - startedAt }, 'watcher.check_ok');

  } catch (err) {
    const isWatcherErr = err instanceof WatcherError;
    log.warn({
      err: { code: isWatcherErr ? err.code : 'WATCHER_UNKNOWN', message: (err as Error).message },
      durationMs: Date.now() - startedAt,
    }, 'watcher.check_failed');

    await db.updateWatchLastChecked(definition.id, {
      checkedAt: new Date(),
      status: 'error',
      errorMessage: (err as Error).message,
    });

    // Alert only if consecutive failures hit threshold
    const consecutiveFails = await db.countConsecutiveWatcherFailures(definition.id);
    if (consecutiveFails >= 3) {
      await NotificationService.fire('watcher.consecutive_failures', {
        definitionId: definition.id,
        failureCount: consecutiveFails,
      });
      log.error({ consecutiveFails }, 'watcher.alert_threshold_reached');
    }
    // Do NOT rethrow — allow other watchers to continue
  }
}
```

#### HTTP API Error Handler (Fastify)

```typescript
// src/server.ts — global error handler

fastify.setErrorHandler((error, request, reply) => {
  const requestId = request.id;

  if (error instanceof IsoManagerError) {
    // Known, structured error
    request.log.warn({
      err: error.toJSON(),
      requestId,
      path: request.url,
    }, 'api.request_error');

    return reply.status(error.statusCode).send({
      // RFC 7807 Problem Details
      type: `https://iso-manager.local/errors/${error.code.toLowerCase()}`,
      title: error.code,
      status: error.statusCode,
      detail: error.message,
      requestId,
      ...(process.env.NODE_ENV === 'development' ? { context: error.context } : {}),
    });
  }

  // Unknown error — don't leak internals
  request.log.error({
    err: { message: error.message, stack: error.stack },
    requestId,
    path: request.url,
  }, 'api.unhandled_error');

  return reply.status(500).send({
    type: 'https://iso-manager.local/errors/internal_error',
    title: 'INTERNAL_ERROR',
    status: 500,
    detail: 'An unexpected error occurred.',
    requestId,
  });
});
```

---

### 2.6 User-Facing Error Messages

The rule: never show raw error messages or stack traces to the UI. Map error codes to human-readable messages:

```typescript
// src/utils/errorMessages.ts

const ERROR_MESSAGES: Record<string, { title: string; suggestion: string }> = {
  DOWNLOAD_NETWORK_TIMEOUT: {
    title: 'Download timed out',
    suggestion: 'The server took too long to respond. Check your network and try again.',
  },
  CHECKSUM_MISMATCH: {
    title: 'File integrity check failed',
    suggestion: 'The downloaded file doesn\'t match its expected checksum. This ISO has been marked corrupt. Try downloading again.',
  },
  STORAGE_DISK_FULL: {
    title: 'Not enough disk space',
    suggestion: 'Free up space or delete archived ISOs before continuing.',
  },
  STORAGE_PERMISSION_DENIED: {
    title: 'Can\'t write to storage path',
    suggestion: 'Check that the storage directory exists and the app has write permission.',
  },
  SSRF_BLOCKED: {
    title: 'Download URL rejected',
    suggestion: 'Private network addresses and loopback URLs are not allowed for security reasons.',
  },
  WATCHER_PARSE_FAILED: {
    title: 'Version detection failed',
    suggestion: 'The watcher couldn\'t find a version number on that page. The site\'s HTML may have changed — check your CSS selector.',
  },
  VALIDATION_ERROR: {
    title: 'Invalid input',
    suggestion: 'Please check the highlighted fields.',  // field detail comes from error.context
  },
};
```

**UI Toast notifications:**
- Error → red toast, stays until dismissed
- Warning → amber toast, auto-dismisses after 8s
- Success → green toast, auto-dismisses after 4s
- Info → blue toast, auto-dismisses after 5s

---

### 2.7 Log Storage, Retention & Rotation

```
Log files stored at: $ISO_STORE_PATH/../logs/
├── app.log          ← current active log (JSON, one entry per line = NDJSON)
├── app.2026-05-12.log.gz
├── app.2026-05-11.log.gz
└── ...

Rotation: Daily, at midnight UTC
Compression: gzip on rotation
Retention: 30 days (configurable via config.yaml: logging.retention_days)
Max file size before force-rotate: 100MB

Implementation: pino + pino-roll (zero-dependency rotation with pino)
```

```typescript
// src/server.ts — Pino setup

import pino from 'pino';
import pinoPretty from 'pino-pretty'; // dev only

const logger = pino({
  level: config.logging.level,
  redact: {
    paths: ['req.headers.authorization', '*.api_key', '*.secret', '*.password'],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({ method: req.method, url: req.url, id: req.id }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  base: {
    service: 'iso-manager',
    version: process.env.npm_package_version,
    hostname: os.hostname(),
    pid: process.pid,
  },
},
process.env.NODE_ENV === 'development'
  ? pinoPretty({ colorize: true, translateTime: 'SYS:HH:MM:ss' })
  : pino.destination({ dest: config.logging.path, sync: false })
);
```

---

### 2.8 Log Viewer UI Spec (`/audit` page)

The log viewer gives operators visibility into everything the system has done and why things went wrong.

**Components:**

**Filter Bar:**
```
[Event Type ▾] [Severity ▾] [ISO Name search...] [From date] [To date] [↓ Export]
```

**Event type presets (quick filter chips):**
```
All | Downloads | Integrity | Watchers | Retention | Errors only
```

**Log Table:**

| Time | Level | Event | ISO | Message | Details |
|---|---|---|---|---|---|
| 14:23:41 | OK | download.completed | Ubuntu 24.04.2 | 1.47 GB in 43s | ▸ |
| 14:21:03 | INFO | retention.archived | Ubuntu | v24.04.0 → archive | ▸ |
| 14:18:55 | WARN | watcher.detected | Proxmox VE | New: 8.3-1 | ▸ |
| 14:12:30 | ERROR | integrity.failed | Rocky 9.4 | Checksum mismatch | ▸ |

**Details panel (expand row):**
```json
{
  "eventType": "integrity.failed",
  "timestamp": "2026-05-13T14:12:30Z",
  "severity": "error",
  "payload": {
    "expected": "a3b4c5d6e7f8...",
    "actual":   "f0e1d2c3b4a5...",
    "filePath": "/data/iso-store/downloads/550e8400.part",
    "definitionName": "Rocky Linux 9",
    "versionString": "9.4"
  }
}
```

Displayed as formatted JSON in a code block. "Copy to Clipboard" button. "View ISO" link.

---

### 2.9 Alerting & Escalation

For a homelab context, alerting is handled via webhooks (no external service required):

**Alert triggers:**
```yaml
alerts:
  storage_threshold:    true   # fire when disk > threshold %
  download_failed_all:  true   # all retries exhausted
  checksum_failure:     true   # file corrupt
  consecutive_watch_failures: 3  # N in a row for same definition
  database_error:       true   # any SQLite critical error
```

**Webhook payload for alerts:**
```json
{
  "event": "alert.checksum_failure",
  "severity": "error",
  "timestamp": "2026-05-13T14:12:30Z",
  "data": {
    "definitionName": "Rocky Linux 9",
    "versionString": "9.4",
    "expected": "a3b4c5...",
    "actual": "f0e1d2...",
    "message": "Downloaded ISO failed integrity verification"
  }
}
```

This webhook can be consumed by: Grafana Alertmanager, Uptime Kuma (POST webhook), Home Assistant, Slack (via workflow), ntfy.sh, Gotify, or any custom receiver.

---

## 3. End-to-End Testing Strategy

### 3.1 Testing Philosophy

**The testing pyramid for this project:**

```
         /  E2E (Playwright)  \          ← ~30 tests: critical user journeys
        /────────────────────────\
       /  Integration (Supertest) \      ← ~80 tests: API + DB + services
      /──────────────────────────────\
     /       Unit (Vitest/Jest)        \  ← ~200 tests: pure logic
    ────────────────────────────────────
```

E2E tests validate complete user journeys — they are slow but high-confidence. They mock nothing (except external HTTP via a local mock server) and test against a real running instance of the application.

**E2E scope:** UI flows that a real user would perform, with assertions on both the UI state and the resulting database/filesystem state.

---

### 3.2 Tool Stack

| Tool | Role |
|---|---|
| **Playwright** | Browser automation (Chromium default, Firefox + WebKit in CI) |
| **@playwright/test** | Test runner, fixtures, assertion library |
| **msw (Mock Service Worker)** | Intercept & mock external HTTP calls (download URLs, watch endpoints) |
| **nock** | HTTP interception at Node.js level for backend integration tests |
| **docker-compose** | Isolated test environment with real SQLite, real filesystem |
| **@axe-core/playwright** | Automated accessibility auditing in E2E tests |
| **Percy (or Playwright screenshots)** | Visual regression testing |
| **k6** | Performance/load testing (separate suite) |

---

### 3.3 Test Environment Setup

```yaml
# docker-compose.test.yml

services:
  iso-manager-test:
    build: .
    environment:
      NODE_ENV: test
      ISO_MANAGER_API_KEY: test-api-key-do-not-use-in-production
      ISO_MANAGER_DB_PATH: /tmp/test-db/iso-manager-test.sqlite3
      ISO_STORE_PATH: /tmp/test-iso-store
      LOG_LEVEL: error   # suppress logs in test output
    volumes:
      - /tmp/test-iso-store:/tmp/test-iso-store
      - /tmp/test-db:/tmp/test-db
    ports:
      - "3722:3721"   # different port to avoid clash with local dev

  mock-server:
    image: mockserver/mockserver:5.15
    ports:
      - "1080:1080"
    environment:
      MOCKSERVER_INITIALIZATION_JSON_PATH: /config/expectations.json
    volumes:
      - ./tests/e2e/mock-server:/config
```

**Playwright config:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,

  use: {
    baseURL: 'http://localhost:3722',
    extraHTTPHeaders: { 'Authorization': 'Bearer test-api-key-do-not-use-in-production' },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
    { name: 'mobile',   use: { ...devices['iPhone 14'] } },
  ],

  globalSetup: './tests/e2e/setup/global-setup.ts',
  globalTeardown: './tests/e2e/setup/global-teardown.ts',

  webServer: {
    command: 'docker-compose -f docker-compose.test.yml up',
    url: 'http://localhost:3722/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
```

**Fixtures (reusable test state):**
```typescript
// tests/e2e/fixtures/index.ts

import { test as base } from '@playwright/test';
import { ApiClient } from './ApiClient';
import { DatabaseHelper } from './DatabaseHelper';

type Fixtures = {
  api: ApiClient;
  db: DatabaseHelper;
  withDefinition: (overrides?: Partial<IsoDefinition>) => Promise<IsoDefinition>;
  withActiveVersion: (defId: string) => Promise<IsoVersion>;
};

export const test = base.extend<Fixtures>({
  api: async ({ request }, use) => {
    await use(new ApiClient(request, 'http://localhost:3722'));
  },
  db: async ({}, use) => {
    await use(new DatabaseHelper('/tmp/test-db/iso-manager-test.sqlite3'));
  },
  withDefinition: async ({ api }, use) => {
    const created: IsoDefinition[] = [];
    await use(async (overrides = {}) => {
      const def = await api.createDefinition({ ...defaultDefinition, ...overrides });
      created.push(def);
      return def;
    });
    // Cleanup after test
    for (const def of created) await api.deleteDefinition(def.id);
  },
});

export { expect } from '@playwright/test';
```

---

### 3.4 Test Scenarios (Full Matrix)

#### Suite 1: Authentication

```
AUTH-01  Access UI without API key — expect login screen / 401
AUTH-02  Enter valid API key — expect redirect to dashboard
AUTH-03  Enter invalid API key — expect error message
AUTH-04  API request without bearer token — expect 401 JSON response
AUTH-05  API request with invalid bearer token — expect 401 JSON response
AUTH-06  Rotate API key in settings — old key rejected, new key works
```

#### Suite 2: ISO Catalog — CRUD

```
CAT-01   Load catalog page — renders without errors, shows empty state if no ISOs
CAT-02   Add ISO definition (all fields) — definition appears in catalog table
CAT-03   Add ISO with duplicate name + same family + same arch — expect conflict error
CAT-04   Edit ISO definition — changes persist, reflected in table
CAT-05   Delete ISO definition with no versions — definition removed
CAT-06   Delete ISO definition WITH active versions — confirmation required; after confirm, definition and versions removed
CAT-07   Filter catalog by family — only matching entries shown
CAT-08   Filter catalog by tag — only tagged entries shown
CAT-09   Search catalog by name — partial match works, case-insensitive
CAT-10   Clear all filters — full catalog restored
```

#### Suite 3: Download Management

```
DL-01    Trigger manual download — job appears in Downloads page with status "queued"
DL-02    Download starts — progress bar appears with percentage and speed
DL-03    Download completes — ISO appears as "active" in version history; file exists on disk
DL-04    Checksum verifies — badge shows "SHA256 ✓" after completion
DL-05    Checksum fails (mock bad checksum) — ISO marked "corrupt"; error in audit log; user notified
DL-06    Download URL returns 404 (mock) — job fails after retries; error surfaced in UI
DL-07    Download URL returns 500 (mock) — retries 3 times with backoff; final failure recorded
DL-08    Network timeout during download (mock) — retry logic triggers; progress preserved if resumable
DL-09    Cancel in-progress download — job cancelled; partial .part file cleaned up
DL-10    Cancel queued download — job removed from queue
DL-11    Concurrent downloads (3 simultaneous) — all progress independently; no corruption
DL-12    Queue priority reorder — dragging changes execution order
DL-13    Retry failed job — new download attempt starts
DL-14    Download large file (2GB mock) — no memory spike; progress streams correctly
```

#### Suite 4: Version History & Retention

```
RET-01   First download creates version 1 — version appears in timeline with "active" status
RET-02   Second download creates version 2 — both versions active (retention limit = 5)
RET-03   Download 6th version (retention=5) — oldest version automatically archived
RET-04   Archived version not shown by default — visible after clicking "Show archived"
RET-05   Manually archive an active version — version moves to archive; active count decreases
RET-06   Restore archived version to active — version promoted to active; archive count decreases
RET-07   Delete archived version — confirmation required; file removed from disk
RET-08   Retention behavior = "delete" — versions deleted (not archived) when over limit
RET-09   Apply retention manually via UI — excess versions archived immediately
RET-10   Change retention count lower — excess already-active versions archived on next download
RET-11   Version timeline shows all history — archived, active, corrupt all visible with correct badges
```

#### Suite 5: Watcher & Auto-Update

```
WCH-01   Enable watch on ISO with "html_scrape" strategy — watcher appears in Watchers page
WCH-02   "Test Now" button — runs check immediately, shows result inline
WCH-03   New version detected (mock) — notification badge appears on Watchers nav item
WCH-04   Auto-download enabled: new version detected — download starts automatically
WCH-05   Auto-download disabled: new version detected — notification only, no download
WCH-06   Watcher parse failure (mock returns bad HTML) — status shows "error", no crash
WCH-07   Consecutive watcher failures (3) — alert threshold triggered; webhook fires
WCH-08   Disable watcher — no more checks scheduled
WCH-09   Watcher runs on schedule — last-checked timestamp updates
WCH-10   Manual trigger while auto-check in progress — second check queued, not duplicate-executed
```

#### Suite 6: Audit Log

```
LOG-01   Dashboard live log shows new events in real-time (WebSocket)
LOG-02   Audit log page loads all events, newest first
LOG-03   Filter by event type "download.completed" — only those events shown
LOG-04   Filter by severity "error" — only errors shown
LOG-05   Filter by date range — events outside range excluded
LOG-06   Search by ISO name — only events for that ISO shown
LOG-07   Expand log entry — JSON payload rendered in code block
LOG-08   Copy log entry payload — clipboard contains JSON
LOG-09   Export filtered log as NDJSON — file downloads with correct content
LOG-10   Auto-scroll pauses when user scrolls up; resumes on scroll-to-bottom
```

#### Suite 7: Error States

```
ERR-01   Download URL blocked by SSRF protection (localhost) — clear error shown, not generic 500
ERR-02   Storage path missing — startup fails gracefully; clear error in health endpoint
ERR-03   Disk full during download (mock) — storage error surfaced; download marked failed
ERR-04   Invalid config.yaml — app refuses to start; error printed clearly
ERR-05   API key missing on startup — key generated and printed to logs; UI prompts setup
ERR-06   Corrupt ISO file (manual edit after download) — verify endpoint detects, marks corrupt
ERR-07   Network drops mid-download — reconnect / retry behavior
ERR-08   WebSocket disconnect — live log shows reconnect indicator; resumes on reconnect
```

#### Suite 8: Security

```
SEC-01   SSRF attempt via download URL (127.0.0.1) — blocked
SEC-02   SSRF attempt via download URL (10.0.0.1) — blocked
SEC-03   Path traversal attempt in API body — sanitized, no effect
SEC-04   XSS attempt in ISO name field — escaped on render
SEC-05   API key visible in UI settings — partially masked (last 6 chars only)
SEC-06   API response never includes full API key in JSON
SEC-07   Webhook secret never appears in audit log or API response
```

#### Suite 9: Settings

```
SET-01   Change concurrent download limit — new limit respected immediately
SET-02   Change storage alert threshold — alert fires at new threshold
SET-03   Add webhook — appears in list; test button sends test event
SET-04   Edit webhook — changes saved
SET-05   Delete webhook — removed from list
SET-06   Webhook test fires HMAC-signed payload — signature header present
SET-07   Export settings — downloads config YAML
```

#### Suite 10: Responsive / Accessibility

```
ACC-01   Dashboard on mobile (375px) — layout adapts, no overflow
ACC-02   Keyboard navigation through catalog table — Tab/Arrow keys work
ACC-03   Screen reader announces status badge text — not just color
ACC-04   Confirm dialog traps focus while open
ACC-05   All interactive elements have visible focus ring
ACC-06   axe-core audit on each page — zero critical or serious violations
ACC-07   Dark/light mode toggle — all text maintains contrast ratio ≥ 4.5:1
```

---

### 3.5 Playwright Test Structure & Conventions

```
tests/
├── e2e/
│   ├── fixtures/
│   │   ├── index.ts           ← extended test + exports
│   │   ├── ApiClient.ts       ← typed REST client for setup/teardown
│   │   └── DatabaseHelper.ts  ← direct SQLite queries for assertions
│   ├── setup/
│   │   ├── global-setup.ts    ← ensure app running, seed test data
│   │   └── global-teardown.ts ← clean up test DB, temp files
│   ├── mock-server/
│   │   └── expectations.json  ← MockServer config for external HTTP
│   ├── pages/
│   │   ├── DashboardPage.ts   ← Page Object Model
│   │   ├── CatalogPage.ts
│   │   ├── DownloadsPage.ts
│   │   └── ...
│   └── specs/
│       ├── auth.spec.ts
│       ├── catalog.spec.ts
│       ├── downloads.spec.ts
│       ├── versions-retention.spec.ts
│       ├── watchers.spec.ts
│       ├── audit-log.spec.ts
│       ├── error-states.spec.ts
│       ├── security.spec.ts
│       └── accessibility.spec.ts
```

**Page Object Model example:**
```typescript
// tests/e2e/pages/CatalogPage.ts

import { Page, Locator, expect } from '@playwright/test';

export class CatalogPage {
  readonly page: Page;
  readonly addIsoButton: Locator;
  readonly searchInput: Locator;
  readonly familyFilter: Locator;
  readonly isoTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addIsoButton = page.getByRole('button', { name: 'Add ISO' });
    this.searchInput = page.getByPlaceholder('Search ISOs...');
    this.familyFilter = page.getByRole('combobox', { name: 'Family' });
    this.isoTable = page.getByRole('table');
  }

  async goto() {
    await this.page.goto('/catalog');
    await expect(this.isoTable).toBeVisible();
  }

  async addDefinition(data: {
    name: string; family: string; sourceUrl: string; checksumUrl: string;
  }) {
    await this.addIsoButton.click();
    await this.page.getByLabel('Name').fill(data.name);
    await this.page.getByLabel('Family').fill(data.family);
    await this.page.getByLabel('Source URL').fill(data.sourceUrl);
    await this.page.getByLabel('Checksum URL').fill(data.checksumUrl);
    await this.page.getByRole('button', { name: 'Save' }).click();
    await expect(this.page.getByText(data.name)).toBeVisible();
  }

  async getRowByName(name: string) {
    return this.isoTable.getByRole('row').filter({ hasText: name });
  }

  async expectStatusBadge(name: string, status: string) {
    const row = await this.getRowByName(name);
    await expect(row.getByRole('status')).toContainText(status);
  }
}
```

**Example test:**
```typescript
// tests/e2e/specs/downloads.spec.ts

import { test, expect } from '../fixtures';
import { DownloadsPage } from '../pages/DownloadsPage';

test.describe('Download Management', () => {

  test('DL-03: download completes and ISO appears as active', async ({ page, withDefinition, api, db }) => {
    // Arrange: create a definition pointing to mock server
    const definition = await withDefinition({
      name: 'Test Ubuntu',
      sourceUrl: 'http://localhost:1080/mock-ubuntu-24.04.iso',
      checksumUrl: 'http://localhost:1080/mock-ubuntu-24.04.iso.sha256',
    });

    const downloadsPage = new DownloadsPage(page);
    await downloadsPage.goto();

    // Act: trigger download
    await api.triggerDownload(definition.id);
    await page.reload();

    // Assert: progress bar appears
    const jobCard = downloadsPage.getJobCard('Test Ubuntu');
    await expect(jobCard).toBeVisible();
    await expect(jobCard.getByRole('progressbar')).toBeVisible();

    // Wait for completion (up to 30s for test)
    await expect(jobCard.getByText('completed')).toBeVisible({ timeout: 30_000 });

    // Assert database state
    const versions = await db.getVersionsByDefinitionId(definition.id);
    expect(versions).toHaveLength(1);
    expect(versions[0].status).toBe('active');
    expect(versions[0].checksumVerified).toBe(true);

    // Assert file on disk
    const fileExists = await db.checkFileExists(versions[0].filePath);
    expect(fileExists).toBe(true);
  });

  test('DL-05: checksum failure marks ISO corrupt and shows error', async ({ page, withDefinition, api }) => {
    // Mock server returns file but wrong checksum
    const definition = await withDefinition({
      name: 'Corrupt Test ISO',
      sourceUrl: 'http://localhost:1080/mock-corrupt.iso',
      checksumUrl: 'http://localhost:1080/mock-bad-checksum.sha256',
    });

    await api.triggerDownload(definition.id);
    const downloadsPage = new DownloadsPage(page);
    await downloadsPage.goto();

    const jobCard = downloadsPage.getJobCard('Corrupt Test ISO');
    await expect(jobCard.getByText('Checksum mismatch')).toBeVisible({ timeout: 30_000 });

    // Navigate to catalog and check status
    await page.goto('/catalog');
    const catalogPage = // ... get page reference
    await expect(page.getByText('Corrupt')).toBeVisible();

    // Audit log should have integrity.failed entry
    await page.goto('/audit');
    await expect(page.getByText('integrity.failed')).toBeVisible();
  });

});
```

---

### 3.6 Visual Regression Testing

Use Playwright's built-in screenshot comparison as the primary VRT tool. For homelab use, this is sufficient without a paid Percy subscription.

```typescript
// In each page spec, add a snapshot at key stable states:

test('catalog page visual baseline', async ({ page }) => {
  await page.goto('/catalog');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('catalog-empty.png', {
    maxDiffPixelRatio: 0.02,   // allow 2% diff (anti-aliasing etc.)
  });
});

test('download progress visual baseline', async ({ page }) => {
  // Set up a paused download
  await expect(page.locator('.download-card')).toHaveScreenshot('download-progress.png');
});
```

Snapshots stored in `tests/e2e/snapshots/` and committed. Update with `playwright test --update-snapshots` when intentional UI changes are made.

---

### 3.7 Accessibility Testing

```typescript
// tests/e2e/specs/accessibility.spec.ts

import { test, expect } from '../fixtures';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { name: 'Dashboard', path: '/' },
  { name: 'Catalog', path: '/catalog' },
  { name: 'Downloads', path: '/downloads' },
  { name: 'Watchers', path: '/watchers' },
  { name: 'Audit Log', path: '/audit' },
  { name: 'Archive', path: '/archive' },
  { name: 'Settings', path: '/settings' },
];

for (const { name, path } of pages) {
  test(`${name} page has no critical axe violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Zero critical or serious violations
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(critical, `Critical violations on ${name}: ${JSON.stringify(critical, null, 2)}`).toHaveLength(0);
  });
}
```

---

### 3.8 Performance & Load Testing (k6)

Run separately from E2E suite. Target: validate NFRs from Section 3 of the main architecture document.

```javascript
// tests/perf/catalog-list.k6.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // ramp up to 50 concurrent users
    { duration: '60s', target: 100 },  // hold at 100
    { duration: '10s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<200'],   // NFR-01: 99th percentile < 200ms
    errors: ['rate<0.01'],              // <1% error rate
  },
};

const BASE_URL = 'http://localhost:3722';
const HEADERS = { 'Authorization': 'Bearer test-api-key-do-not-use-in-production' };

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/definitions?page=1&limit=25`, { headers: HEADERS });
  const ok = check(res, { 'status is 200': (r) => r.status === 200 });
  errorRate.add(!ok);
  sleep(1);
}
```

```javascript
// tests/perf/concurrent-downloads.k6.js — monitors memory during 3 concurrent downloads
```

**Run:** `k6 run tests/perf/catalog-list.k6.js`

---

### 3.9 CI/CD Integration

```yaml
# .github/workflows/e2e.yml

name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium firefox webkit

      - name: Build app
        run: npm run build

      - name: Start test environment
        run: docker-compose -f docker-compose.test.yml up -d
        timeout-minutes: 3

      - name: Wait for app to be ready
        run: |
          for i in {1..30}; do
            curl -sf http://localhost:3722/health && break || sleep 2
          done

      - name: Run E2E tests
        run: npx playwright test
        env:
          CI: true

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

      - name: Upload screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-screenshots
          path: test-results/
          retention-days: 7

      - name: Stop test environment
        if: always()
        run: docker-compose -f docker-compose.test.yml down -v
```

---

## Summary of Additions to v1.0.0

| Area | What was added |
|---|---|
| **UX/UI** | Full CSS token system (dark + light), typography scale, spacing system, component library spec (7 components), page-by-page layout specs for all 8 pages, responsive breakpoints, accessibility requirements, animation guidance |
| **Error Handling** | 11-class error taxonomy, base error schema (TypeScript), structured JSON log schema, per-component error handling patterns (download worker, watcher, HTTP handler), user-facing message mapping, pino logging configuration, log rotation strategy |
| **Logging** | NDJSON structured logs, redaction of secrets, request ID tracing, audit event shapes, log viewer UI spec |
| **E2E Testing** | Playwright + axe-core + k6 tool stack, Docker test environment config, fixture architecture, Page Object Model pattern, 80+ named test scenarios across 10 suites, visual regression approach, CI/CD workflow |

*End of Supplement Document — v1.1.0*
