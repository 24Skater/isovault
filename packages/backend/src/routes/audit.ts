import type { FastifyInstance } from 'fastify';
import { listEvents } from '../services/audit';
import type { AuditSeverity } from '../types';
import { parsePagination } from '../utils/pagination';

export async function auditRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/audit ────────────────────────────────────────────────────────
  fastify.get('/api/audit', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          entityType: { type: 'string', maxLength: 100 },
          entityId: { type: 'string', maxLength: 36 },
          severity: { type: 'string', enum: ['debug', 'info', 'warn', 'error', 'critical'] },
          eventType: { type: 'string', maxLength: 200 },
          page: { type: 'string', pattern: '^[1-9][0-9]*$' },
          limit: { type: 'string', pattern: '^[1-9][0-9]*$' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const query = request.query as {
        entityType?: string;
        entityId?: string;
        severity?: string;
        eventType?: string;
        page?: string;
        limit?: string;
      };

      const { page, limit } = parsePagination(query);

      const { entries, total } = listEvents({
        entityType: query.entityType,
        entityId: query.entityId,
        severity: query.severity as AuditSeverity | undefined,
        eventType: query.eventType,
        page,
        limit,
      });

      return { data: entries, total, page, limit };
    },
  });
}
