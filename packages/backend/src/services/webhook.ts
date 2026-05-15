import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client';
import type { Webhook } from '../types';
import type { WebhookRow } from '../db/schema';

// ─── Mapper ───────────────────────────────────────────────────────────────────

function rowToWebhook(row: WebhookRow): Webhook {
  return {
    id: row.id,
    url: row.url,
    secret: row.secret,
    events: JSON.parse(row.events) as string[],
    enabled: row.enabled === 1,
    lastFiredAt: row.last_fired_at,
    lastStatusCode: row.last_status_code,
    createdAt: row.created_at,
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export interface CreateWebhookInput {
  url: string;
  secret?: string | null;
  events: string[];
  enabled?: boolean;
}

export function listWebhooks(): Webhook[] {
  const rows = getDb()
    .prepare('SELECT * FROM webhooks ORDER BY created_at DESC')
    .all() as WebhookRow[];
  return rows.map(rowToWebhook);
}

export function getWebhook(id: string): Webhook | null {
  const row = getDb().prepare('SELECT * FROM webhooks WHERE id = ?').get(id) as
    | WebhookRow
    | undefined;
  return row ? rowToWebhook(row) : null;
}

export function createWebhook(input: CreateWebhookInput): Webhook {
  const id = uuidv4();
  getDb()
    .prepare(
      `INSERT INTO webhooks (id, url, secret, events, enabled)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.url,
      input.secret ?? null,
      JSON.stringify(input.events),
      input.enabled !== false ? 1 : 0,
    );
  return rowToWebhook(getDb().prepare('SELECT * FROM webhooks WHERE id = ?').get(id) as WebhookRow);
}

export function updateWebhook(
  id: string,
  patch: Partial<CreateWebhookInput>,
): Webhook | null {
  const existing = getWebhook(id);
  if (!existing) return null;

  const url = patch.url ?? existing.url;
  const secret = 'secret' in patch ? (patch.secret ?? null) : existing.secret;
  const events = patch.events ?? existing.events;
  const enabled = patch.enabled !== undefined ? patch.enabled : existing.enabled;

  getDb()
    .prepare(
      `UPDATE webhooks SET url = ?, secret = ?, events = ?, enabled = ?
       WHERE id = ?`,
    )
    .run(url, secret, JSON.stringify(events), enabled ? 1 : 0, id);

  return rowToWebhook(getDb().prepare('SELECT * FROM webhooks WHERE id = ?').get(id) as WebhookRow);
}

export function deleteWebhook(id: string): boolean {
  const result = getDb().prepare('DELETE FROM webhooks WHERE id = ?').run(id);
  return result.changes > 0;
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

function sign(payload: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export async function dispatch(eventType: string, payload: Record<string, unknown>): Promise<void> {
  const hooks = getDb()
    .prepare(`SELECT * FROM webhooks WHERE enabled = 1`)
    .all() as WebhookRow[];

  const eligible = hooks.filter((h) => {
    const events = JSON.parse(h.events) as string[];
    return events.includes('*') || events.includes(eventType);
  });

  if (eligible.length === 0) return;

  const body = JSON.stringify({ event: eventType, ...payload, timestamp: new Date().toISOString() });

  await Promise.allSettled(
    eligible.map(async (hook) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (hook.secret) headers['X-IsoVault-Signature'] = sign(body, hook.secret);

      let statusCode = 0;
      try {
        const res = await fetch(hook.url, { method: 'POST', headers, body });
        statusCode = res.status;
      } catch {
        statusCode = 0;
      }

      getDb()
        .prepare(
          `UPDATE webhooks SET last_fired_at = datetime('now'), last_status_code = ?
           WHERE id = ?`,
        )
        .run(statusCode || null, hook.id);
    }),
  );
}
