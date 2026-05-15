# isovault

A self-hosted ISO file manager. Tracks OS distributions, downloads ISOs on a schedule, verifies checksums, and keeps a configurable number of versions per distribution.

## Features

- Define ISO sources with URL templates and watch strategies (cron or RSS)
- Automatic downloads with retry and concurrency control
- SHA-256 / SHA-512 / MD5 checksum verification
- Retention policies: keep the last N active versions, archive or delete the rest
- Webhook delivery (HMAC-SHA256 signed) on any event
- Audit log for all operations
- SQLite database with daily backups
- REST API + React dashboard

## Prerequisites

- Docker and Docker Compose, **or** Node.js 20+ and npm 10+
- ~500 MB disk space for the application; plan storage for your ISOs separately

## Quickstart (Docker)

```bash
git clone https://github.com/you/isovault.git
cd isovault
cp .env.example .env
docker compose up -d
```

The API key is printed once to the container log on first boot:

```bash
docker compose logs backend | grep "API key"
```

Open the dashboard at [http://localhost:3721](http://localhost:3721).

## Quickstart (local dev)

```bash
npm install
cp .env.example .env
# edit .env — set ISO_STORE_PATH to a writable directory
npm run dev          # starts backend on :3721 and frontend on :5173
```

## Configuration

isovault reads `config.yaml` (path overridable via `ISO_MANAGER_CONFIG`). All keys can be overridden with environment variables.

| `config.yaml` key | Env var | Default | Description |
| --- | --- | --- | --- |
| `server.port` | `PORT` | `3721` | HTTP listen port |
| `server.host` | — | `0.0.0.0` | Bind address |
| `storage.path` | `ISO_STORE_PATH` | `/data/iso-store` | ISO file root |
| `storage.alert_threshold_percent` | — | `80` | Dashboard warning threshold |
| `downloads.max_concurrent` | — | `3` | Parallel downloads |
| `downloads.retry_max_attempts` | — | `3` | Per-download retry limit |
| `retention.default_count` | — | `5` | Versions to keep |
| `retention.default_behavior` | — | `archive` | `archive` or `delete` excess |
| `logging.level` | `ISO_MANAGER_LOG_LEVEL` | `info` | `debug\|info\|warn\|error` |

## Authentication

Every request except `GET /api/health` requires a Bearer token:

```http
Authorization: Bearer <api-key>
```

The key is auto-generated on first boot and printed once to stdout. To set a fixed key, add it to `.env` before starting:

```env
ISO_MANAGER_API_KEY=your-secret-key
```

To rotate the key, delete the `api_key_hash` row from the `settings` table and restart.

## API Overview

All endpoints return JSON. Errors follow [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807).

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check (no auth required) |
| `GET` | `/api/stats` | Aggregated dashboard stats |
| `GET` | `/api/definitions` | List ISO definitions |
| `POST` | `/api/definitions` | Create definition |
| `GET` | `/api/definitions/:id` | Get definition |
| `PATCH` | `/api/definitions/:id` | Update definition |
| `DELETE` | `/api/definitions/:id` | Delete definition |
| `GET` | `/api/definitions/:id/versions` | List versions for a definition |
| `GET` | `/api/versions` | Cross-definition version query (`?status=archived`) |
| `GET` | `/api/versions/:id/download` | Stream ISO file |
| `GET` | `/api/versions/:id/verify` | Re-verify checksum on disk |
| `PATCH` | `/api/versions/:id/archive` | Archive a version |
| `PATCH` | `/api/versions/:id/activate` | Restore archived version |
| `DELETE` | `/api/versions/:id` | Permanently delete version + file |
| `GET` | `/api/downloads` | List active/queued downloads |
| `POST` | `/api/downloads` | Trigger a manual download |
| `DELETE` | `/api/downloads/:id` | Cancel a download |
| `GET` | `/api/audit` | Audit log (`?severity=warn&eventType=download.failed`) |
| `GET` | `/api/settings` | List all settings |
| `PUT` | `/api/settings/:key` | Update a setting |
| `GET` | `/api/storage/stats` | Disk usage |
| `GET` | `/api/webhooks` | List webhooks |
| `POST` | `/api/webhooks` | Create webhook |
| `PATCH` | `/api/webhooks/:id` | Update webhook |
| `DELETE` | `/api/webhooks/:id` | Delete webhook |
| `POST` | `/api/webhooks/:id/test` | Send test event |

## Webhook Signing

Webhook requests include an `X-IsoVault-Signature` header when a secret is configured:

```http
X-IsoVault-Signature: sha256=<hex>
```

Verify in your receiver:

```python
import hashlib, hmac
expected = 'sha256=' + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
assert hmac.compare_digest(expected, request.headers['X-IsoVault-Signature'])
```

## Backups

SQLite is backed up daily at 2 AM (configurable via `scheduler.db_backup_cron`). Backups are stored alongside the database file as `iso-manager-YYYYMMDD-HHmmss.sqlite3`. The last 7 backups are kept automatically.

## Development

```bash
npm run dev          # concurrent backend + frontend dev servers
npm run build        # build both packages
npm test             # run backend unit tests
npm run typecheck    # TypeScript check (both packages)
```

## License

MIT
