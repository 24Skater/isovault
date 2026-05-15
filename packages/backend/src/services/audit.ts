import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client';
import type { AuditLogEntry, AuditSeverity } from '../types';
import type { AuditLogRow } from '../db/schema';
import { dispatch } from './webhook';

// ─── Mapper ───────────────────────────────────────────────────────────────────

function rowToEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    payload: row.payload ? (JSON.parse(row.payload) as Record<string, unknown>) : null,
    severity: row.severity as AuditSeverity,
    createdAt: row.created_at,
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

export function logEvent(
  eventType: string,
  entityType: string | null,
  entityId: string | null,
  payload: Record<string, unknown> | null,
  severity: AuditSeverity = 'info',
): AuditLogEntry {
  const db = getDb();
  const id = uuidv4();

  db.prepare(
    `INSERT INTO audit_log (id, event_type, entity_type, entity_id, payload, severity)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, eventType, entityType, entityId, payload ? JSON.stringify(payload) : null, severity);

  const entry = rowToEntry(
    db.prepare('SELECT * FROM audit_log WHERE id = ?').get(id) as AuditLogRow,
  );

  // Fire webhooks asynchronously — don't await to avoid blocking callers
  void dispatch(eventType, {
    entityType,
    entityId,
    payload,
    severity,
    auditId: id,
  }).catch(() => {
    // Webhook delivery failures must not propagate to audit callers
  });

  return entry;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export interface ListEventsParams {
  entityType?: string;
  entityId?: string;
  severity?: AuditSeverity;
  eventType?: string;
  limit?: number;
  page?: number;
}

export function listEvents(params: ListEventsParams): { entries: AuditLogEntry[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const bindings: (string | number | null)[] = [];

  if (params.entityType) {
    conditions.push('entity_type = ?');
    bindings.push(params.entityType);
  }
  if (params.entityId) {
    conditions.push('entity_id = ?');
    bindings.push(params.entityId);
  }
  if (params.severity) {
    conditions.push('severity = ?');
    bindings.push(params.severity);
  }
  if (params.eventType) {
    conditions.push('event_type = ?');
    bindings.push(params.eventType);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = params.limit ?? 50;
  const page = params.page ?? 1;
  const offset = (page - 1) * limit;

  const { count } = db
    .prepare(`SELECT COUNT(*) as count FROM audit_log ${where}`)
    .get(...bindings) as { count: number };

  const rows = db
    .prepare(`SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...bindings, limit, offset) as AuditLogRow[];

  return { entries: rows.map(rowToEntry), total: count };
}
