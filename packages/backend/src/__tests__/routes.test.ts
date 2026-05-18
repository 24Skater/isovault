/**
 * Route-level integration tests.
 *
 * Spins up the full Fastify app (via buildServer) backed by an in-memory SQLite
 * database and uses fastify.inject() so no network port is opened.
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';

const TEST_STORE = path.join(os.tmpdir(), `isovault-routes-test-${process.pid}`);
const TEST_DB = path.join(os.tmpdir(), `isovault-jest-routes-${process.pid}.sqlite3`);
const TEST_API_KEY = 'test-api-key-' + crypto.randomBytes(8).toString('hex');

// ─── Mocks (must come before any imports that resolve the mocked modules) ─────

jest.mock('../config', () => ({
  __esModule: true,
  default: {
    storage: {
      path: path.join(require('os').tmpdir(), `isovault-routes-test-${process.pid}`),
      alertThresholdPercent: 95,
    },
    retention: { defaultCount: 5, defaultBehavior: 'archive' },
    logging: { level: 'silent', retentionDays: 30 },
    server: { port: 3725, host: '0.0.0.0', corsOrigins: [] },
    database: { path: ':memory:' },
    downloads: {
      maxConcurrent: 3,
      retryMaxAttempts: 3,
      retryBaseDelaySeconds: 30,
      timeoutSeconds: 3600,
    },
    scheduler: {
      watcherCheckIntervalCron: '0 * * * *',
      dbBackupCron: '0 2 * * *',
      cleanupCron: '0 3 * * *',
    },
    security: { ssrfProtection: true, maxRedirects: 5 },
  },
}));

jest.mock('../websocket/hub', () => ({
  hub: { broadcast: jest.fn(), register: jest.fn(), unregister: jest.fn(), clientCount: 0 },
}));

jest.mock('../services/webhook', () => ({
  dispatch: jest.fn().mockResolvedValue(undefined),
  listWebhooks: jest.fn().mockReturnValue([]),
  getWebhook: jest.fn().mockReturnValue(null),
  createWebhook: jest.fn().mockResolvedValue({
    id: 'wh-1',
    url: 'https://example.com/hook',
    events: ['download.completed'],
    enabled: true,
  }),
  updateWebhook: jest.fn(),
  deleteWebhook: jest.fn(),
  WEBHOOK_EVENTS: [
    'download.completed',
    'download.failed',
    'version.imported',
    'definition.created',
    'webhook.test',
    '*',
  ],
}));

// Stub download manager so tests don't start polling timers
jest.mock('../services/download', () => ({
  downloadManager: {
    recoverStaleJobs: jest.fn(),
    startPolling: jest.fn(),
    stopPolling: jest.fn(),
    enqueue: jest.fn(),
    cancel: jest.fn(),
  },
  rowToJob: jest.fn(),
}));

// Stub scheduler
jest.mock('../scheduler/cron', () => ({
  scheduler: { start: jest.fn(), stop: jest.fn() },
}));

// Watcher service imports jsdom (html-scrape strategy) which can't load in CJS jest mode
jest.mock('../services/watcher', () => ({
  watcherService: {
    runDue: jest.fn().mockResolvedValue(undefined),
    runOne: jest.fn().mockResolvedValue(undefined),
  },
}));

// Fix API key to a known value
process.env['ISO_MANAGER_API_KEY'] = TEST_API_KEY;

import { FastifyInstance } from 'fastify';
import { initDb, closeDb } from '../db/client';
import { buildServer } from '../server';
import { createDefinition } from '../services/iso';
import { initApiKey } from '../services/auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const auth = { authorization: `Bearer ${TEST_API_KEY}` };

// ─── Setup / teardown ─────────────────────────────────────────────────────────

let server: FastifyInstance;

beforeAll(async () => {
  fs.mkdirSync(TEST_STORE, { recursive: true });
  initDb(TEST_DB);
  await initApiKey();
  server = await buildServer();
});

afterAll(async () => {
  await server.close();
  closeDb();
  try {
    fs.rmSync(TEST_STORE, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TEST_DB + ext);
    } catch {
      /* ignore */
    }
  }
});

// ─── Auth enforcement ─────────────────────────────────────────────────────────

describe('authentication', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/definitions' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 with wrong token', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/definitions',
      headers: { authorization: 'Bearer wrong-key' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('allows GET /health without auth', async () => {
    const res = await server.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });

  it('allows GET /ready without auth', async () => {
    const res = await server.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
  });
});

// ─── GET /api/definitions ─────────────────────────────────────────────────────

describe('GET /api/definitions', () => {
  it('returns paginated definitions', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/definitions',
      headers: auth,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: unknown[]; total: number; page: number; limit: number }>();
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  it('rejects invalid page value', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/definitions?page=0',
      headers: auth,
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects non-numeric page', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/definitions?page=abc',
      headers: auth,
    });
    expect(res.statusCode).toBe(400);
  });
});

// ─── POST /api/definitions ────────────────────────────────────────────────────

describe('POST /api/definitions', () => {
  it('creates a definition and returns 201', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/definitions',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { name: `Route-Test-${Date.now()}`, family: 'testfamily', architecture: 'x86_64' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ id: string; name: string }>();
    expect(body.id).toBeTruthy();
  });

  it('returns 400 when name is missing', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/definitions',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { family: 'testfamily', architecture: 'x86_64' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when checksumAlgo is invalid', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/definitions',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: {
        name: `Bad-Algo-${Date.now()}`,
        family: 'f',
        architecture: 'x86_64',
        checksumAlgo: 'md2',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('strips unknown fields and still creates the definition', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/definitions',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: {
        name: `Extra-${Date.now()}`,
        family: 'f',
        architecture: 'x86_64',
        unknownField: 'stripped-by-fastify',
      },
    });
    // Fastify strips additionalProperties rather than rejecting them
    expect(res.statusCode).toBe(201);
  });

  it('returns 409 when name already exists', async () => {
    const uniqueName = `Conflict-${Date.now()}`;
    await server.inject({
      method: 'POST',
      url: '/api/definitions',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { name: uniqueName, family: 'f', architecture: 'x86_64' },
    });
    const res = await server.inject({
      method: 'POST',
      url: '/api/definitions',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { name: uniqueName, family: 'f', architecture: 'x86_64' },
    });
    expect(res.statusCode).toBe(409);
  });
});

// ─── GET /api/definitions/:id ─────────────────────────────────────────────────

describe('GET /api/definitions/:id', () => {
  it('returns 200 with the definition', async () => {
    const def = createDefinition({
      name: `Get-Test-${Date.now()}`,
      family: 'tf',
      architecture: 'x86_64',
    });
    const res = await server.inject({
      method: 'GET',
      url: `/api/definitions/${def.id}`,
      headers: auth,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ id: string }>().id).toBe(def.id);
  });

  it('returns 404 for unknown id', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/definitions/00000000-0000-0000-0000-000000000000',
      headers: auth,
    });
    expect(res.statusCode).toBe(404);
  });
});

// ─── GET /api/versions ────────────────────────────────────────────────────────

describe('GET /api/versions', () => {
  it('returns versions list', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/versions', headers: auth });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json<{ data: unknown[] }>().data)).toBe(true);
  });

  it('accepts a valid status filter', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/versions?status=active',
      headers: auth,
    });
    expect(res.statusCode).toBe(200);
  });

  it('rejects an invalid status value', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/versions?status=invalid',
      headers: auth,
    });
    expect(res.statusCode).toBe(400);
  });
});

// ─── GET /api/audit ───────────────────────────────────────────────────────────

describe('GET /api/audit', () => {
  it('returns audit log', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/audit', headers: auth });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json<{ data: unknown[] }>().data)).toBe(true);
  });

  it('accepts a valid severity filter', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/audit?severity=warn',
      headers: auth,
    });
    expect(res.statusCode).toBe(200);
  });

  it('accepts critical severity filter', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/audit?severity=critical',
      headers: auth,
    });
    expect(res.statusCode).toBe(200);
  });

  it('rejects an invalid severity value', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/audit?severity=bogus',
      headers: auth,
    });
    expect(res.statusCode).toBe(400);
  });

  it('ignores unknown query params (Fastify strips them)', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/audit?unknownParam=x',
      headers: auth,
    });
    // Fastify strips additionalProperties from querystrings
    expect(res.statusCode).toBe(200);
  });
});

// ─── GET /api/downloads ───────────────────────────────────────────────────────

describe('GET /api/downloads', () => {
  it('returns 200', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/downloads', headers: auth });
    expect(res.statusCode).toBe(200);
  });

  it('rejects invalid status enum', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/downloads?status=notastatus',
      headers: auth,
    });
    expect(res.statusCode).toBe(400);
  });

  it('accepts a valid status filter', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/downloads?status=queued',
      headers: auth,
    });
    expect(res.statusCode).toBe(200);
  });
});

// ─── POST /api/webhooks ───────────────────────────────────────────────────────

describe('POST /api/webhooks', () => {
  it('returns 400 when url is missing', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/webhooks',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { events: ['download.completed'] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when events array is empty', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/webhooks',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { url: 'https://example.com/hook', events: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when url is not a valid URI', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/webhooks',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { url: 'not-a-url', events: ['download.completed'] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when events contains an unknown event type', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/webhooks',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { url: 'https://example.com/hook', events: ['totally.fake.event'] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 201 with a known event type', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/webhooks',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { url: 'https://example.com/hook', events: ['download.completed'] },
    });
    expect(res.statusCode).toBe(201);
  });

  it('accepts wildcard event type', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/webhooks',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { url: 'https://example.com/hook', events: ['*'] },
    });
    expect(res.statusCode).toBe(201);
  });
});

// ─── GET /api/settings ────────────────────────────────────────────────────────

describe('GET /api/settings', () => {
  it('returns settings list', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/settings', headers: auth });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json<{ data: unknown[] }>().data)).toBe(true);
  });
});

// ─── PUT /api/settings/:key ───────────────────────────────────────────────────

describe('PUT /api/settings/:key', () => {
  it('returns 200 for valid numeric setting', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/settings/max_concurrent_downloads',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { value: '3' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 400 for out-of-range value', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/settings/max_concurrent_downloads',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { value: '999' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for non-integer numeric setting', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/settings/log_retention_days',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { value: 'notanumber' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid retention behavior', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/settings/default_retention_behavior',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { value: 'truncate' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 200 for valid retention behavior', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/settings/default_retention_behavior',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { value: 'delete' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 404 for unknown setting key', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/settings/does_not_exist',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { value: '5' },
    });
    expect(res.statusCode).toBe(404);
  });
});

// ─── Integration tokens ───────────────────────────────────────────────────────

describe('GET /api/integrations/tokens', () => {
  it('returns empty array initially', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/integrations/tokens',
      headers: auth,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<unknown[]>();
    expect(Array.isArray(body)).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/integrations/tokens' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/integrations/tokens', () => {
  it('creates a token and returns plaintext once', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/integrations/tokens',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { name: 'Test Token', description: 'For testing' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ id: string; name: string; token: string; revoked: boolean }>();
    expect(typeof body.id).toBe('string');
    expect(body.name).toBe('Test Token');
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(0);
    expect(body.revoked).toBe(false);
  });

  it('returns 400 when name is missing', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/integrations/tokens',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { description: 'No name' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when name is blank', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/integrations/tokens',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { name: '   ' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/integrations/tokens',
      headers: { 'content-type': 'application/json' },
      payload: { name: 'Unauthorized Token' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('PATCH /api/integrations/tokens/:id/revoke', () => {
  it('revokes an active token', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/integrations/tokens',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { name: 'Revoke Me' },
    });
    const { id } = createRes.json<{ id: string }>();

    const revokeRes = await server.inject({
      method: 'PATCH',
      url: `/api/integrations/tokens/${id}/revoke`,
      headers: auth,
    });
    expect(revokeRes.statusCode).toBe(204);

    // Token should now appear as revoked in the list
    const listRes = await server.inject({
      method: 'GET',
      url: '/api/integrations/tokens',
      headers: auth,
    });
    const tokens = listRes.json<Array<{ id: string; revoked: boolean }>>();
    const tok = tokens.find((t) => t.id === id);
    expect(tok?.revoked).toBe(true);
  });

  it('returns 404 for unknown token', async () => {
    const res = await server.inject({
      method: 'PATCH',
      url: '/api/integrations/tokens/00000000-0000-0000-0000-000000000000/revoke',
      headers: auth,
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when revoking an already-revoked token', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/integrations/tokens',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { name: 'Already Revoked' },
    });
    const { id } = createRes.json<{ id: string }>();

    await server.inject({
      method: 'PATCH',
      url: `/api/integrations/tokens/${id}/revoke`,
      headers: auth,
    });

    const res = await server.inject({
      method: 'PATCH',
      url: `/api/integrations/tokens/${id}/revoke`,
      headers: auth,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/integrations/tokens/:id', () => {
  it('hard-deletes a token', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/integrations/tokens',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { name: 'Delete Me' },
    });
    const { id } = createRes.json<{ id: string }>();

    const deleteRes = await server.inject({
      method: 'DELETE',
      url: `/api/integrations/tokens/${id}`,
      headers: auth,
    });
    expect(deleteRes.statusCode).toBe(204);

    const listRes = await server.inject({
      method: 'GET',
      url: '/api/integrations/tokens',
      headers: auth,
    });
    const tokens = listRes.json<Array<{ id: string }>>();
    expect(tokens.find((t) => t.id === id)).toBeUndefined();
  });

  it('returns 404 for unknown token', async () => {
    const res = await server.inject({
      method: 'DELETE',
      url: '/api/integrations/tokens/00000000-0000-0000-0000-000000000000',
      headers: auth,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('integration token read-only access', () => {
  it('allows GET /api/definitions with a valid integration token', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/integrations/tokens',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { name: 'Read-only Token' },
    });
    const { token } = createRes.json<{ token: string }>();

    const res = await server.inject({
      method: 'GET',
      url: '/api/definitions',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('denies POST with an integration token (write blocked)', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/integrations/tokens',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: { name: 'Write-block Token' },
    });
    const { token } = createRes.json<{ token: string }>();

    const res = await server.inject({
      method: 'POST',
      url: '/api/definitions',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: { name: 'Blocked', family: 'linux', architecture: 'x86_64' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ─── Error response shape ─────────────────────────────────────────────────────

describe('error response shape', () => {
  it('404 follows RFC 7807 with requestId', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/definitions/00000000-0000-0000-0000-999999999999',
      headers: auth,
    });
    expect(res.statusCode).toBe(404);
    const body = res.json<{ type: string; status: number; requestId: string }>();
    expect(typeof body.type).toBe('string');
    expect(body.status).toBe(404);
    expect(body.requestId).toBeTruthy();
  });

  it('400 validation error returns 400 status code', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/definitions',
      headers: { ...auth, 'content-type': 'application/json' },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});
