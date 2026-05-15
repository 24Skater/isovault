# HomeLab ISO Manager — Architecture & Build Specification

**Version:** 1.0.0  
**Prepared For:** Claude Code / Cursor Development Team  
**Classification:** Internal — HomeLab Tooling  
**Stack Decision:** Node.js (TypeScript) + React + SQLite  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [System Architecture](#4-system-architecture)
5. [Data Model](#5-data-model)
6. [Module Breakdown](#6-module-breakdown)
7. [API Design](#7-api-design)
8. [UI/UX Specification](#8-uiux-specification)
9. [Security Architecture](#9-security-architecture)
10. [Storage & File System Design](#10-storage--file-system-design)
11. [Scheduler & Watcher Design](#11-scheduler--watcher-design)
12. [Version & Retention Policy Engine](#12-version--retention-policy-engine)
13. [Testing Strategy](#13-testing-strategy)
14. [Infrastructure & Deployment](#14-infrastructure--deployment)
15. [Error Handling & Observability](#15-error-handling--observability)
16. [Future Roadmap (Post-MVP)](#16-future-roadmap-post-mvp)
17. [Development Phases & Task Breakdown](#17-development-phases--task-breakdown)
18. [Known Risks & Mitigations](#18-known-risks--mitigations)

---

## 1. Project Overview

### 1.1 Purpose

HomeLab ISO Manager is a self-hosted web application designed to organize, track, version, and automatically update ISO images for homelab environments. It provides a Proxmox-style "download by URL" capability, automated update watching, configurable version retention policies, and an archive system — all accessible through a clean web UI and a REST API.

### 1.2 Goals

- Centralize ISO storage with structured metadata and version history
- Automate detection and downloading of new ISO versions from upstream sources
- Enforce per-ISO retention policies (e.g., keep 5 latest Ubuntu Server ISOs; archive the rest)
- Provide integrity verification (checksum validation) on every ISO
- Be lightweight enough to run on a Raspberry Pi 4 or a small VM
- Expose a REST API so Proxmox, Ansible, or scripts can query and pull ISOs programmatically

### 1.3 Non-Goals (MVP)

- No BitTorrent downloading (HTTP/HTTPS only in MVP)
- No multi-user RBAC (single-user or shared token auth for MVP)
- No cloud storage backend (local filesystem only in MVP)
- No automated VM provisioning

### 1.4 Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Backend Runtime | Node.js 20 LTS (TypeScript) | Async I/O ideal for download management; strong ecosystem |
| Web Framework | Fastify | Faster than Express, schema-first, built-in validation |
| Database | SQLite via better-sqlite3 | Zero-config, sufficient for homelab scale, file-portable |
| Job Scheduler | node-cron + Bull/BullMQ (Redis optional) | Simple cron for watches; queue for download jobs |
| Frontend | React 18 + Vite + TailwindCSS | Lightweight, fast dev loop, no heavy framework needed |
| File Integrity | sha256 / sha512 via Node crypto | Native, no external dependency |
| Download Engine | got (HTTP client) with streaming | Resumable, streaming downloads without memory buffering |
| Process Manager | PM2 | Homelab-appropriate, log rotation, restart on crash |
| Containerization | Docker + docker-compose | Optional but primary deployment target |

---

## 2. Functional Requirements

### 2.1 ISO Catalog Management

- **FR-01** User can add an ISO entry manually with: name, family (e.g., Ubuntu), architecture, version string, source URL, checksum URL, checksum algorithm
- **FR-02** User can edit metadata of any catalog entry
- **FR-03** User can delete an ISO entry (with confirmation; moves file to archive or deletes permanently based on policy)
- **FR-04** User can tag ISOs (e.g., `proxmox`, `servers`, `desktop`, `router`)
- **FR-05** User can search and filter the catalog by family, tag, architecture, status

### 2.2 Download Management

- **FR-06** User can trigger a manual download of any catalog entry
- **FR-07** Downloads stream directly to disk — no full file in memory
- **FR-08** Download progress is visible in real-time in the UI (WebSocket push)
- **FR-09** Failed downloads retry up to N times (configurable per-ISO or globally)
- **FR-10** Completed downloads are checksum-verified automatically; failures are flagged
- **FR-11** User can cancel an in-progress download
- **FR-12** Concurrent download limit is configurable (default: 3)

### 2.3 Version History & Retention

- **FR-13** Every downloaded ISO is stored as a versioned record with timestamp, checksum, size, and source URL
- **FR-14** User configures a retention policy per ISO family or per individual ISO: "keep N versions active"
- **FR-15** When a new version is downloaded and the active count exceeds the retention limit, oldest versions are moved to archive automatically
- **FR-16** Archive ISOs remain on disk (separate path) but are marked archived in the DB — accessible but not surfaced by default
- **FR-17** User can manually promote an archived ISO back to active
- **FR-18** User can permanently delete archived ISOs with confirmation
- **FR-19** Full version history timeline is visible per ISO family in the UI

### 2.4 Watch & Auto-Update

- **FR-20** User can configure a "watch" for any ISO entry with a check interval (e.g., every 6h, daily, weekly)
- **FR-21** Watcher polls the configured source or a custom version-check endpoint/page to detect new versions
- **FR-22** Version detection strategies: RSS feed, HTML scrape (configurable CSS selector), JSON API endpoint, checksum file comparison, filename pattern matching
- **FR-23** When a new version is detected, user can choose: notify only, auto-download, or auto-download-and-apply-retention
- **FR-24** Watchers show last-checked timestamp, last-found version, and status in UI
- **FR-25** All watch events are logged to the audit log

### 2.5 Integrity & Verification

- **FR-26** SHA256, SHA512, and MD5 checksum verification supported
- **FR-27** User can re-verify any existing ISO on demand
- **FR-28** ISOs with checksum mismatch are flagged `CORRUPT` — never served or used
- **FR-29** Checksum files can be fetched from a URL or entered manually

### 2.6 API & Integrations

- **FR-30** Full REST API for all catalog and download operations
- **FR-31** API key authentication (bearer token)
- **FR-32** Proxmox-compatible download URL endpoint: `/api/v1/iso/:id/download` streams the file
- **FR-33** Webhook notifications on: download complete, new version detected, checksum failure, archive event

---

## 3. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | UI response time for catalog operations | < 200ms |
| NFR-02 | Download throughput | Limited only by network/disk; no artificial cap |
| NFR-03 | Disk space monitoring | Alert at 80% of configured storage path |
| NFR-04 | Database backup | Automatic SQLite backup every 24h, keep 7 copies |
| NFR-05 | Log retention | 30 days rolling, configurable |
| NFR-06 | Startup time | < 5 seconds cold start |
| NFR-07 | Memory footprint (idle) | < 150MB RAM |
| NFR-08 | Config portability | All config in a single `config.yaml` + `.env` |
| NFR-09 | API backward compatibility | Semver; breaking changes require major version bump |
| NFR-10 | Accessibility | WCAG 2.1 AA for UI |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / API Client                      │
│                     (React SPA or REST consumer)                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼──────────────────────────────────────┐
│                      Fastify HTTP Server                         │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────────────┐  │
│  │  REST Router │  │  WebSocket Hub  │  │  Static File Srvr  │  │
│  │  /api/v1/*   │  │  (progress push)│  │  (React SPA)       │  │
│  └──────┬───────┘  └────────┬────────┘  └────────────────────┘  │
│         │                  │                                      │
│  ┌──────▼──────────────────▼────────────────────────────────┐   │
│  │                    Service Layer                          │   │
│  │  IsoService │ DownloadService │ WatcherService │ PolicySvc│   │
│  └──────┬──────────────────────────────────────────┬────────┘   │
│         │                                          │             │
│  ┌──────▼──────────┐                    ┌──────────▼──────────┐ │
│  │  SQLite (DB)    │                    │   Job Queue          │ │
│  │  better-sqlite3 │                    │   (node-cron /       │ │
│  │                 │                    │    in-process queue) │ │
│  └─────────────────┘                    └──────────┬──────────┘ │
└─────────────────────────────────────────────────────┼───────────┘
                                                      │
┌─────────────────────────────────────────────────────▼───────────┐
│                     File System Layer                             │
│  /iso-store/                                                      │
│    ├── active/          ← served ISOs                             │
│    │     └── ubuntu/server/24.04.2/ubuntu-server-24.04.2.iso     │
│    ├── archive/         ← retained but not active                 │
│    │     └── ubuntu/server/22.04.5/ubuntu-server-22.04.5.iso     │
│    ├── downloads/       ← in-progress .part files                 │
│    └── checksums/       ← cached .sha256 sidecar files           │
└─────────────────────────────────────────────────────────────────┘
```

### 4.1 Process Architecture

Single Node.js process handles:
- HTTP server (Fastify)
- WebSocket server (ws via Fastify plugin)
- Scheduler (node-cron, in-process)
- Download workers (worker_threads pool, max configurable)
- File system watcher (chokidar for local import detection)

**Why no separate Redis/queue process?** Homelab context. Keeping it single-process with an in-memory queue backed by SQLite persistence eliminates operational overhead. If a user wants to scale, a Redis adapter can be dropped in later (BullMQ supports this).

---

## 5. Data Model

### 5.1 Tables

```sql
-- Core ISO family/definition
CREATE TABLE iso_definitions (
  id            TEXT PRIMARY KEY,           -- UUID v4
  name          TEXT NOT NULL,              -- "Ubuntu Server"
  family        TEXT NOT NULL,              -- "ubuntu"
  architecture  TEXT NOT NULL DEFAULT 'x86_64',
  description   TEXT,
  tags          TEXT,                       -- JSON array: ["server","lts"]
  source_url    TEXT,                       -- Template URL or latest URL
  checksum_url  TEXT,                       -- URL to fetch checksum file
  checksum_algo TEXT DEFAULT 'sha256',      -- sha256 | sha512 | md5
  retention_count INTEGER DEFAULT 5,        -- How many active versions to keep
  retention_behavior TEXT DEFAULT 'archive',-- archive | delete
  watch_enabled BOOLEAN DEFAULT 0,
  watch_strategy TEXT,                      -- rss | html_scrape | json_api | checksum | filename
  watch_config  TEXT,                       -- JSON: strategy-specific config
  watch_interval_minutes INTEGER DEFAULT 360,
  watch_last_checked_at DATETIME,
  watch_last_version_found TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Individual ISO version records
CREATE TABLE iso_versions (
  id              TEXT PRIMARY KEY,          -- UUID v4
  definition_id   TEXT NOT NULL REFERENCES iso_definitions(id),
  version_string  TEXT NOT NULL,             -- "24.04.2"
  release_date    DATE,
  filename        TEXT NOT NULL,             -- "ubuntu-server-24.04.2-amd64.iso"
  file_path       TEXT NOT NULL,             -- absolute path on disk
  file_size_bytes INTEGER,
  checksum        TEXT,                      -- actual checksum value
  checksum_verified BOOLEAN DEFAULT 0,
  status          TEXT DEFAULT 'pending',    -- pending | downloading | active | archived | corrupt | deleted
  source_url      TEXT NOT NULL,             -- actual download URL used
  download_started_at DATETIME,
  download_completed_at DATETIME,
  archived_at     DATETIME,
  notes           TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Download jobs (persistent queue)
CREATE TABLE download_jobs (
  id              TEXT PRIMARY KEY,
  version_id      TEXT NOT NULL REFERENCES iso_versions(id),
  status          TEXT DEFAULT 'queued',     -- queued | running | paused | completed | failed | cancelled
  priority        INTEGER DEFAULT 5,
  attempt_count   INTEGER DEFAULT 0,
  max_attempts    INTEGER DEFAULT 3,
  bytes_downloaded INTEGER DEFAULT 0,
  bytes_total     INTEGER,
  error_message   TEXT,
  started_at      DATETIME,
  completed_at    DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit/event log
CREATE TABLE audit_log (
  id          TEXT PRIMARY KEY,
  event_type  TEXT NOT NULL,                 -- download.started | version.archived | watch.triggered | etc.
  entity_type TEXT,                          -- iso_definition | iso_version | download_job
  entity_id   TEXT,
  payload     TEXT,                          -- JSON blob of event details
  severity    TEXT DEFAULT 'info',           -- info | warn | error
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks config
CREATE TABLE webhooks (
  id          TEXT PRIMARY KEY,
  url         TEXT NOT NULL,
  secret      TEXT,                          -- HMAC secret for signature
  events      TEXT NOT NULL,                 -- JSON array of subscribed event types
  enabled     BOOLEAN DEFAULT 1,
  last_fired_at DATETIME,
  last_status_code INTEGER,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- App settings (key-value)
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 Indexes

```sql
CREATE INDEX idx_iso_versions_definition ON iso_versions(definition_id, status, created_at DESC);
CREATE INDEX idx_iso_versions_status ON iso_versions(status);
CREATE INDEX idx_download_jobs_status ON download_jobs(status, priority DESC, created_at ASC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
```

---

## 6. Module Breakdown

```
src/
├── server.ts                  ← Fastify bootstrap, plugin registration
├── config.ts                  ← Config loader (config.yaml + env vars)
│
├── db/
│   ├── client.ts              ← better-sqlite3 setup, WAL mode, migrations
│   ├── migrations/            ← numbered SQL migration files
│   └── schema.ts              ← TypeScript types mirroring DB schema
│
├── routes/
│   ├── definitions.ts         ← CRUD for iso_definitions
│   ├── versions.ts            ← Version listing, status, promote/archive
│   ├── downloads.ts           ← Start, cancel, progress endpoints
│   ├── jobs.ts                ← Job queue inspection
│   ├── watchers.ts            ← Watch config + trigger manually
│   ├── settings.ts            ← App settings CRUD
│   ├── webhooks.ts            ← Webhook CRUD
│   └── health.ts              ← /health, /ready endpoints
│
├── services/
│   ├── IsoService.ts          ← Business logic for catalog management
│   ├── DownloadService.ts     ← Download orchestration, resume, verify
│   ├── WatcherService.ts      ← Watch scheduling, version detection
│   ├── RetentionService.ts    ← Policy enforcement, archive/delete logic
│   ├── IntegrityService.ts    ← Checksum computation & verification
│   ├── StorageService.ts      ← File system operations, path resolution
│   ├── NotificationService.ts ← Webhook dispatch, HMAC signing
│   └── AuditService.ts        ← Structured event logging
│
├── workers/
│   ├── DownloadWorker.ts      ← worker_thread: executes one download job
│   └── WorkerPool.ts          ← Manages N concurrent worker threads
│
├── scheduler/
│   ├── CronScheduler.ts       ← node-cron wrapper, watcher tick management
│   └── JobQueue.ts            ← In-process FIFO queue with SQLite persistence
│
├── watchers/
│   ├── BaseWatcher.ts         ← Abstract interface
│   ├── RssWatcher.ts          ← Parse RSS/Atom feed for new versions
│   ├── HtmlScrapeWatcher.ts   ← CSS selector-based HTML scraping
│   ├── JsonApiWatcher.ts      ← JSON endpoint polling
│   ├── ChecksumWatcher.ts     ← Compare remote checksum file to known
│   └── FilenameWatcher.ts     ← Detect version from filename patterns
│
├── websocket/
│   └── ProgressHub.ts         ← WebSocket broadcaster for download progress
│
├── utils/
│   ├── checksum.ts            ← Streaming hash computation
│   ├── fileSize.ts            ← Human-readable size formatting
│   ├── retry.ts               ← Exponential backoff retry utility
│   ├── semver.ts              ← Version comparison helpers
│   └── uuid.ts                ← UUID v4 generation
│
└── types/
    └── index.ts               ← Shared TypeScript interfaces & enums

frontend/
├── src/
│   ├── App.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx      ← Summary: storage, active downloads, recent events
│   │   ├── Catalog.tsx        ← ISO definition list + add/edit
│   │   ├── Versions.tsx       ← Version history per definition
│   │   ├── Downloads.tsx      ← Active + queued download jobs
│   │   ├── Watchers.tsx       ← Watch config management
│   │   ├── Archive.tsx        ← Browse archived ISOs
│   │   ├── Settings.tsx       ← Global config, API keys, webhooks
│   │   └── AuditLog.tsx       ← Event log viewer with filters
│   ├── components/
│   │   ├── DownloadProgress.tsx
│   │   ├── RetentionPolicyForm.tsx
│   │   ├── WatchStrategyForm.tsx
│   │   ├── ChecksumBadge.tsx
│   │   ├── StatusBadge.tsx
│   │   └── StorageUsageBar.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts    ← WebSocket connection + reconnect logic
│   │   ├── useDownloads.ts
│   │   └── useDefinitions.ts
│   └── api/
│       └── client.ts          ← Typed API client (fetch wrappers)
```

---

## 7. API Design

### 7.1 Base

- Base path: `/api/v1`
- Auth: `Authorization: Bearer <api_key>` header on all non-health routes
- Content-Type: `application/json`
- All timestamps: ISO 8601 UTC
- All IDs: UUID v4 strings
- Pagination: `?page=1&limit=25` (cursor-based in v2)
- Errors follow RFC 7807 Problem Details format

### 7.2 Endpoints

```
# Health
GET  /health                            → {status, uptime, version}
GET  /ready                             → 200 if ready, 503 if not

# ISO Definitions
GET    /api/v1/definitions              → paginated list
POST   /api/v1/definitions              → create new definition
GET    /api/v1/definitions/:id          → single definition
PUT    /api/v1/definitions/:id          → full update
PATCH  /api/v1/definitions/:id          → partial update
DELETE /api/v1/definitions/:id          → delete (with behavior config)

# Versions
GET    /api/v1/definitions/:id/versions → all versions for a definition
GET    /api/v1/versions/:id             → single version record
PATCH  /api/v1/versions/:id/archive     → manually archive a version
PATCH  /api/v1/versions/:id/activate    → promote archived → active
DELETE /api/v1/versions/:id             → permanent delete with confirmation token
GET    /api/v1/versions/:id/verify      → trigger re-verification of checksum
GET    /api/v1/versions/:id/download    → stream ISO file (binary)

# Downloads
GET    /api/v1/downloads                → all jobs (filterable by status)
POST   /api/v1/downloads                → queue a new download job
GET    /api/v1/downloads/:id            → single job status
DELETE /api/v1/downloads/:id            → cancel job
POST   /api/v1/downloads/:id/retry      → retry failed job

# Watchers
GET    /api/v1/watchers                 → all watcher configs
POST   /api/v1/watchers/:definitionId/check → manually trigger a version check now

# Settings
GET    /api/v1/settings                 → all settings
PUT    /api/v1/settings                 → batch update settings

# Webhooks
GET    /api/v1/webhooks                 → list webhooks
POST   /api/v1/webhooks                 → create webhook
PUT    /api/v1/webhooks/:id             → update
DELETE /api/v1/webhooks/:id             → delete
POST   /api/v1/webhooks/:id/test        → send test event

# Audit Log
GET    /api/v1/audit                    → filterable event log

# Storage
GET    /api/v1/storage/stats            → disk usage, file counts by status

# WebSocket
WS     /ws/downloads                    → real-time download progress events
```

### 7.3 WebSocket Event Schema

```json
{
  "type": "download.progress",
  "jobId": "uuid",
  "versionId": "uuid",
  "definitionId": "uuid",
  "bytesDownloaded": 1048576,
  "bytesTotal": 1073741824,
  "percent": 0.098,
  "speedBytesPerSec": 52428800,
  "etaSeconds": 19,
  "timestamp": "2026-05-13T14:23:00Z"
}
```

Event types: `download.progress`, `download.completed`, `download.failed`, `download.cancelled`, `version.detected`, `integrity.failed`, `retention.applied`

---

## 8. UI/UX Specification

### 8.1 Dashboard

- Storage usage ring chart (active vs archive vs available)
- Active downloads panel with live progress bars
- Recent events feed (last 10 audit events)
- Quick stats: total definitions, total versions, last 24h downloads, pending checks

### 8.2 Catalog Page

- Table view: Name | Family | Latest Version | Status | Architecture | Tags | Watch | Actions
- Click row → expands to version timeline
- "+ Add ISO" button → modal with tabbed form (Basic Info | Source & Checksum | Retention Policy | Watch Config)
- Filter bar: Family dropdown, Tag multi-select, Status filter, Architecture filter, search input

### 8.3 Version Timeline (per Definition)

- Vertical timeline showing each version
- Status indicators: active (green), archived (gray), corrupt (red), downloading (blue pulse)
- Each entry shows: version string, date downloaded, file size, checksum status, action buttons
- "Download Latest" CTA prominently placed
- "Apply Retention Policy Now" button

### 8.4 Downloads Page

- Split into: Active | Queued | History tabs
- Active: real-time progress bars (WebSocket), cancel button, speed, ETA
- Queued: drag to reorder priority, cancel, start immediately
- History: searchable, retry button on failed, open file location

### 8.5 Watch Configuration Form

Strategy-specific forms rendered based on selected strategy:
- **RSS/Atom**: feed URL, version extraction regex from entry title/link
- **HTML Scrape**: page URL, CSS selector for version element, regex to extract version string
- **JSON API**: endpoint URL, JSONPath expression to version field, optional auth header
- **Checksum File**: checksum file URL, version derived from current known checksum changing
- **Filename Pattern**: directory listing URL, filename regex with named capture group `(?P<version>...)`

### 8.6 Archive Browser

- Grouped by Definition → shows archived versions with size, date, checksum badge
- Bulk actions: delete selected, restore selected
- Storage reclaim preview before bulk delete

---

## 9. Security Architecture

### 9.1 Authentication

- Single API key stored hashed (bcrypt) in `settings` table
- API key generated on first boot if none exists, printed to stdout once
- Configurable via env var `ISO_MANAGER_API_KEY` (takes precedence; stored as bcrypt hash)
- All API routes protected; UI SPA uses same bearer token stored in `localStorage` (acceptable for homelab single-user)
- Optional: HTTP Basic Auth as alternative for simple integrations (behind config flag)

### 9.2 Input Validation

- All API inputs validated via Fastify JSON Schema (compile-time type safety + runtime validation)
- URL validation: only `http://` and `https://` schemes permitted for download and watch URLs
- File path inputs: never accepted from API — paths derived server-side from definition ID + filename
- Filename sanitization: strip all non-alphanumeric characters except `.`, `-`, `_` before writing to disk

### 9.3 Download Security

- SSRF prevention: DNS rebinding protection — validate that resolved IP of download URL is not RFC 1918 (private) or loopback
- Maximum redirect limit: 5 (prevents redirect loops)
- Download to `.part` temp file in `/iso-store/downloads/`; only moved to final path after checksum pass
- Checksum verification is mandatory before a file becomes `active` status
- File permissions: `644` on ISO files, `755` on directories; process does not run as root

### 9.4 Process Hardening

- Runs as dedicated non-root user `isomgr`
- Docker: `--read-only` root FS with explicit volume mounts; drop all capabilities except `DAC_OVERRIDE` if needed
- `--cap-drop ALL` in docker-compose; no privileged mode
- No shell execution of user-supplied strings; all subprocess calls use arg arrays, never string interpolation
- Outbound connections only to explicitly configured URLs; no arbitrary network scanning

### 9.5 Data Security

- SQLite WAL mode; backups encrypted at rest via `config.yaml` option (uses `sqlcipher` if enabled)
- API key never logged; redacted in all audit events
- Webhook payloads HMAC-SHA256 signed with configurable secret (header: `X-ISO-Manager-Signature`)
- No PII collected; no telemetry; no external calls except configured download/watch URLs

### 9.6 Dependency Management

- `npm audit` runs in CI on every commit
- `package-lock.json` committed and verified in CI
- Dependabot / Renovate configured to keep deps current
- No transitive dependency on native binaries that could introduce supply chain risk (prefer pure-JS where possible)

---

## 10. Storage & File System Design

### 10.1 Directory Structure

```
$ISO_STORE_PATH/                     ← configurable root (default: /var/lib/iso-manager)
├── active/
│   └── {family}/
│       └── {architecture}/
│           └── {version_string}/
│               ├── {filename}.iso
│               └── {filename}.iso.sha256      ← sidecar checksum
├── archive/
│   └── {family}/
│       └── {architecture}/
│           └── {version_string}/
│               ├── {filename}.iso
│               └── {filename}.iso.sha256
├── downloads/
│   └── {job_id}.part                         ← in-progress downloads
├── checksums/
│   └── {definition_id}/
│       └── {version_string}.sha256           ← cached remote checksum files
└── backups/
    └── db/
        └── iso-manager-{date}.sqlite3
```

### 10.2 Storage Monitoring

- Background task runs every 5 minutes to update disk usage stats in `settings` table
- Alert threshold configurable (default: 80% of partition)
- Alert surfaced in UI dashboard and fires webhook event `storage.threshold_exceeded`
- `GET /api/v1/storage/stats` returns: total bytes, used bytes, free bytes, active ISO bytes, archive bytes, pending download bytes

### 10.3 File Movement

- Move operations are atomic on same filesystem (rename syscall)
- Cross-filesystem moves copy then delete; verify checksum after copy before deleting source
- All moves logged to audit log with source path, destination path, timestamp

---

## 11. Scheduler & Watcher Design

### 11.1 Cron Scheduler

```
Every minute:   Check for queued download jobs → dispatch to worker pool
Every 5 min:    Update storage stats
Every hour:     Check all enabled watchers whose next-check time has passed
Every 24 hours: SQLite backup, cleanup old .part files > 48h, log rotation
```

### 11.2 Watcher Execution Flow

```
CronScheduler tick (hourly)
  └── WatcherService.checkDue()
        └── For each definition where watch_enabled=1 AND next_check_time <= now:
              └── WatcherService.checkDefinition(definition)
                    ├── Resolve strategy → instantiate correct Watcher class
                    ├── watcher.detectLatestVersion() → { version, downloadUrl }
                    ├── Compare to latest known active version
                    ├── If new version detected:
                    │     ├── Log to audit_log (event: version.detected)
                    │     ├── Fire webhook (version.detected)
                    │     └── If auto_download=true:
                    │           └── DownloadService.queueDownload(definition, newVersion)
                    └── Update watch_last_checked_at, watch_last_version_found
```

### 11.3 Download Worker Flow

```
JobQueue.dispatch(job)
  └── WorkerPool.submit(job)
        └── DownloadWorker (worker_thread):
              ├── GET source_url (streaming)
              │     ├── Follow redirects (max 5)
              │     ├── Validate Content-Type is not HTML (catches 404 pages)
              │     ├── Stream to {job_id}.part file
              │     └── Report progress every 250ms → main thread → WebSocket
              ├── On completion:
              │     ├── IntegrityService.verify(partFile, expectedChecksum)
              │     ├── On PASS: move .part → active/ path; update DB status → 'active'
              │     ├── On FAIL: flag iso_version status → 'corrupt'; audit log + webhook
              │     └── RetentionService.apply(definition_id)
              └── On error/retry:
                    └── Exponential backoff: 30s, 2m, 10m
```

---

## 12. Version & Retention Policy Engine

### 12.1 Policy Configuration (per Definition)

```yaml
retention_count: 5          # How many active versions to keep
retention_behavior: archive  # archive | delete
```

### 12.2 Enforcement Algorithm

```typescript
function applyRetentionPolicy(definitionId: string): void {
  const activeVersions = db.getActiveVersions(definitionId); 
  // ordered by created_at DESC (newest first)
  
  const keep = activeVersions.slice(0, retention_count);
  const excess = activeVersions.slice(retention_count);
  
  for (const version of excess) {
    if (retention_behavior === 'archive') {
      StorageService.moveToArchive(version);
      db.updateVersionStatus(version.id, 'archived');
      AuditService.log('retention.archived', version);
    } else {
      StorageService.deleteFile(version.file_path);
      db.updateVersionStatus(version.id, 'deleted');
      AuditService.log('retention.deleted', version);
    }
  }
}
```

### 12.3 Policy Timing

- Retention is applied automatically after every successful download
- User can trigger manually via UI or `PATCH /api/v1/definitions/:id/apply-retention`
- Policy changes (editing `retention_count`) do NOT auto-enforce immediately — user must trigger manually or wait for next download

---

## 13. Testing Strategy

### 13.1 Unit Tests (Jest)

- **IntegrityService**: mock file system; test SHA256/512/MD5 computation; test mismatch detection
- **RetentionService**: test boundary conditions (0 excess, exactly N, N+1, N+10); test archive vs delete behavior
- **WatcherService**: mock HTTP responses; test each strategy parser; test version comparison logic
- **StorageService**: mock `fs` module; test path construction; test cross-filesystem move fallback
- **JobQueue**: test FIFO ordering, priority ordering, persistence across simulated restart
- **Config loader**: test env var override, missing required fields, invalid values

**Target coverage: 80% lines, 100% on RetentionService and IntegrityService**

### 13.2 Integration Tests (Vitest + Supertest)

- Spin up real Fastify instance with in-memory SQLite
- Test all REST endpoints: happy path, validation errors, auth failures, 404s
- Test download job lifecycle: queue → start → progress → complete → retention applied
- Test WebSocket events emitted during download lifecycle
- Mock external HTTP (nock) for download and watch URL calls

### 13.3 End-to-End Tests (Playwright)

- Navigate to Catalog page, add ISO definition
- Trigger manual download, verify progress bar appears and completes
- Verify version appears in version timeline
- Add second and third versions, verify retention policy archives oldest
- Visit Archive page, verify archived version present
- Test restore from archive

### 13.4 Security Tests

- Attempt SSRF: configure download URL pointing to `http://127.0.0.1/`, `http://192.168.1.1/` — expect 400
- Attempt path traversal in any string input — expect sanitization
- Hit all routes without auth header — expect 401
- Provide invalid API key — expect 401
- Test that `.part` files are never served via download endpoint
- Fuzz test URL and version string inputs with `fast-check` property testing

### 13.5 Performance Tests (k6)

- Catalog list endpoint: 100 concurrent requests → p99 < 100ms
- Simultaneous 3-download scenario: verify no memory leak over 30 minutes, no corruption
- 1000-entry audit log query with filters: < 200ms

### 13.6 CI Pipeline (GitHub Actions)

```yaml
on: [push, pull_request]
jobs:
  lint:       eslint + prettier check
  typecheck:  tsc --noEmit
  unit:       jest --coverage (fail below 80%)
  audit:      npm audit --audit-level=high
  integration: vitest run (ephemeral SQLite)
  e2e:        playwright test (docker-compose up)
  build:      docker build (verify image builds clean)
```

---

## 14. Infrastructure & Deployment

### 14.1 Docker Compose (Primary Deployment)

```yaml
version: '3.9'
services:
  iso-manager:
    image: iso-manager:latest
    build: .
    restart: unless-stopped
    user: "1000:1000"
    read_only: true
    cap_drop: [ALL]
    ports:
      - "3721:3721"
    volumes:
      - /path/to/iso-store:/data/iso-store
      - ./config.yaml:/app/config.yaml:ro
      - iso-manager-db:/data/db
      - /tmp/iso-manager:/tmp       # writable temp
    environment:
      - ISO_MANAGER_API_KEY=${ISO_MANAGER_API_KEY}
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3721/health"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  iso-manager-db:
```

### 14.2 Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /build
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
RUN addgroup -S isomgr && adduser -S isomgr -G isomgr
WORKDIR /app
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package.json .
RUN mkdir -p /data/iso-store /data/db /tmp/iso-manager \
    && chown -R isomgr:isomgr /data /tmp/iso-manager
USER isomgr
EXPOSE 3721
HEALTHCHECK --interval=30s CMD wget -q --spider http://localhost:3721/health
CMD ["node", "dist/server.js"]
```

### 14.3 config.yaml Schema

```yaml
server:
  port: 3721
  host: "0.0.0.0"
  cors_origins: ["http://localhost:5173"]  # for dev; empty in prod

storage:
  path: "/data/iso-store"
  alert_threshold_percent: 80

downloads:
  max_concurrent: 3
  retry_max_attempts: 3
  retry_base_delay_seconds: 30
  timeout_seconds: 3600        # 1 hour per download max

retention:
  default_count: 5
  default_behavior: "archive"  # archive | delete

scheduler:
  watcher_check_interval_cron: "0 * * * *"    # every hour
  db_backup_cron: "0 2 * * *"                 # 2am daily
  cleanup_cron: "0 3 * * *"                   # 3am daily

security:
  ssrf_protection: true
  max_redirects: 5

logging:
  level: "info"                # debug | info | warn | error
  retention_days: 30
```

### 14.4 Reverse Proxy (Recommended: Nginx)

```nginx
server {
    listen 443 ssl;
    server_name iso.yourhomelab.local;

    ssl_certificate /etc/ssl/certs/homelab.crt;
    ssl_certificate_key /etc/ssl/private/homelab.key;

    location / {
        proxy_pass http://localhost:3721;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";    # WebSocket support
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;                 # For large ISO streams
        proxy_buffering off;                      # For streaming downloads
    }
}
```

---

## 15. Error Handling & Observability

### 15.1 Error Hierarchy

```typescript
class IsoManagerError extends Error { code: string; statusCode: number; }
class ValidationError extends IsoManagerError {}       // 400
class AuthError extends IsoManagerError {}             // 401
class NotFoundError extends IsoManagerError {}         // 404
class ConflictError extends IsoManagerError {}         // 409 (e.g., duplicate version)
class DownloadError extends IsoManagerError {}         // 500 + retry eligible
class ChecksumMismatchError extends IsoManagerError {} // 500 + corrupt flag
class StorageError extends IsoManagerError {}          // 500 + critical
```

All unhandled errors caught by Fastify error handler → RFC 7807 JSON response + audit log entry.

### 15.2 Logging

- Pino logger (built into Fastify) — structured JSON logs
- Log levels: `debug` (dev), `info` (default prod), `warn`, `error`
- Request logging: method, path, status, response time (no body logging to avoid ISO data in logs)
- Sensitive fields redacted: `authorization`, `api_key`, `secret`

### 15.3 Health & Readiness

- `/health` — always 200; returns uptime, version, memory usage
- `/ready` — 503 if DB unavailable or storage path unwritable; 200 otherwise
- Used by Docker healthcheck and optional external monitoring (Uptime Kuma, Grafana, etc.)

### 15.4 Audit Log

Every significant action produces a structured audit event:

```json
{
  "id": "uuid",
  "event_type": "download.completed",
  "entity_type": "iso_version",
  "entity_id": "uuid",
  "payload": {
    "definition_name": "Ubuntu Server",
    "version": "24.04.2",
    "bytes": 1073741824,
    "duration_seconds": 43,
    "checksum_verified": true
  },
  "severity": "info",
  "created_at": "2026-05-13T14:23:00Z"
}
```

---

## 16. Future Roadmap (Post-MVP)

| Feature | Phase | Notes |
|---|---|---|
| BitTorrent download support | v1.1 | Use WebTorrent; important for Ubuntu/Debian |
| Multi-user RBAC | v1.2 | Admin vs read-only viewer roles |
| NFS/SMB share exposure | v1.2 | Serve ISOs directly to PXE/Proxmox via share |
| Proxmox API integration | v1.3 | Push ISOs directly to Proxmox storage via API |
| S3/Backblaze archive backend | v1.3 | Offload archive to cloud storage |
| PXE boot integration | v2.0 | Serve ISOs as PXE boot sources (TFTP + iPXE) |
| Mobile PWA | v2.0 | Offline-capable PWA with push notifications |
| AI-assisted version detection | v2.1 | LLM to parse unstructured release pages |
| Distributed mode (multi-node) | v3.0 | Redis-backed queue, shared DB |

---

## 17. Development Phases & Task Breakdown

### Phase 0 — Scaffolding (Sprint 1)

- [ ] Initialize monorepo: `packages/backend`, `packages/frontend`
- [ ] Backend: Fastify + TypeScript + ESLint + Prettier setup
- [ ] Frontend: Vite + React + TailwindCSS setup
- [ ] SQLite client setup with WAL mode and migration runner
- [ ] Write migration 001: all tables and indexes
- [ ] Config loader (config.yaml + env var merging)
- [ ] `/health` and `/ready` endpoints
- [ ] Docker + docker-compose setup
- [ ] GitHub Actions CI skeleton (lint, typecheck, build)

### Phase 1 — Core Catalog (Sprint 2-3)

- [ ] `iso_definitions` CRUD routes + service
- [ ] `iso_versions` listing and detail routes
- [ ] StorageService: directory creation, path resolution, file moves
- [ ] AuditService: structured event logging
- [ ] Frontend: Catalog page (list + add/edit modal)
- [ ] Frontend: Version timeline component
- [ ] Unit tests: IsoService, StorageService

### Phase 2 — Download Engine (Sprint 3-4)

- [ ] DownloadWorker (worker_thread): streaming download, progress reporting
- [ ] WorkerPool: N concurrent workers, job dispatch
- [ ] JobQueue: SQLite-backed FIFO with priority
- [ ] IntegrityService: streaming SHA256/512/MD5 verification
- [ ] WebSocket ProgressHub
- [ ] `download_jobs` CRUD routes
- [ ] Frontend: Downloads page with live progress bars
- [ ] RetentionService + enforcement on download completion
- [ ] Integration tests: download lifecycle

### Phase 3 — Watch & Auto-Update (Sprint 5-6)

- [ ] CronScheduler setup
- [ ] BaseWatcher interface + RssWatcher + HtmlScrapeWatcher
- [ ] JsonApiWatcher + ChecksumWatcher + FilenameWatcher
- [ ] WatcherService: orchestration, version comparison
- [ ] Watch config persisted in iso_definitions
- [ ] Frontend: Watchers page + strategy-specific form components
- [ ] Unit tests: all Watcher strategies (mocked HTTP)

### Phase 4 — Polish & Security (Sprint 7)

- [ ] SSRF protection middleware
- [ ] Input sanitization review
- [ ] Webhook system (NotificationService + HMAC signing)
- [ ] Frontend: Settings page, Audit Log page, Archive page
- [ ] Storage monitoring + alerts
- [ ] SQLite backup scheduler
- [ ] E2E tests (Playwright)
- [ ] Security tests (SSRF, auth, path traversal)
- [ ] README + user documentation

---

## 18. Known Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Upstream site changes HTML structure, breaking scraper | High | Medium | Expose raw scraper test in UI; alert on consecutive failures; fallback to checksum strategy |
| Download interrupted mid-file, corrupt `.part` | Medium | Low | Checksum verification gates promotion to active; `.part` files cleaned up on restart |
| Storage fills up during large concurrent downloads | Medium | High | Storage alerts at 80%; refuse to queue new downloads if < 5GB free |
| SQLite write contention under concurrent downloads | Low | Medium | WAL mode handles concurrent readers; serialized writes via service layer; single writer pattern |
| API key compromised on homelab network | Low | Medium | Key rotation endpoint; short-lived tokens as future feature; note: HTTPS recommended |
| Version string parsing inconsistency across distros | High | Low | Normalized version storage with raw string preserved; configurable regex per watch strategy |
| Worker thread crash leaks `.part` file | Low | Low | Startup cleanup routine scans `downloads/` for orphaned `.part` files > 1h old |

---

## Appendix A — Pre-Built ISO Watch Configs (Starter Library)

The app should ship with a JSON library of known ISOs that users can import instead of configuring from scratch:

```json
[
  {
    "name": "Ubuntu Server LTS",
    "family": "ubuntu",
    "architecture": "x86_64",
    "watch_strategy": "html_scrape",
    "watch_config": {
      "url": "https://ubuntu.com/download/server",
      "version_selector": ".p-heading--2",
      "version_regex": "Ubuntu Server (\\d+\\.\\d+(?:\\.\\d+)?)",
      "download_url_template": "https://releases.ubuntu.com/{version}/ubuntu-{version}-live-server-amd64.iso",
      "checksum_url_template": "https://releases.ubuntu.com/{version}/SHA256SUMS"
    }
  },
  {
    "name": "Debian Stable Netinst",
    "family": "debian",
    "architecture": "x86_64",
    "watch_strategy": "json_api",
    "watch_config": {
      "url": "https://api.github.com/repos/debian/debian/releases/latest",
      "version_jsonpath": "$.tag_name"
    }
  },
  {
    "name": "Proxmox VE",
    "family": "proxmox",
    "architecture": "x86_64",
    "watch_strategy": "html_scrape",
    "watch_config": {
      "url": "https://www.proxmox.com/en/downloads/proxmox-virtual-environment",
      "version_selector": ".downloadItem h3",
      "version_regex": "Proxmox VE ([\\d.]+) ISO"
    }
  },
  {
    "name": "Rocky Linux",
    "family": "rocky",
    "architecture": "x86_64",
    "watch_strategy": "html_scrape",
    "watch_config": {
      "url": "https://rockylinux.org/download",
      "version_selector": "h2",
      "version_regex": "Rocky Linux (\\d+\\.\\d+)"
    }
  }
]
```

---

## Appendix B — Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `ISO_MANAGER_API_KEY` | No | auto-generated | Bearer token for API auth |
| `ISO_MANAGER_CONFIG` | No | `./config.yaml` | Path to config file |
| `ISO_MANAGER_DB_PATH` | No | `/data/db/iso-manager.sqlite3` | SQLite database path |
| `ISO_MANAGER_LOG_LEVEL` | No | `info` | Logging verbosity |
| `NODE_ENV` | No | `development` | `production` disables stack traces in errors |
| `PORT` | No | `3721` | HTTP listen port (overrides config) |

---

*End of Architecture Document — v1.0.0*
