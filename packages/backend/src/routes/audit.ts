import type { FastifyInstance } from 'fastify';
import { listEvents } from '../services/audit';
import type { AuditSeverity } from '../types';

export async function auditRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/audit ────────────────────────────────────────────────────────
  fastify.get('/api/audit', async (request) => {
    const query = request.query as {
      entityType?: string;
      entityId?: string;
      severity?: string;
      eventType?: string;
      page?: string;
      limit?: string;
    };

    const { entries, total } = listEvents({
      entityType: query.entityType,
      entityId: query.entityId,
      severity: query.severity as AuditSeverity | undefined,
      eventType: query.eventType,
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });

    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 50;

    return { data: entries, total, page, limit };
  });
}
