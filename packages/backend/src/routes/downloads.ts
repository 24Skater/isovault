import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/client';
import { downloadManager, rowToJob } from '../services/download';
import { hub } from '../websocket/hub';
import { NotFoundError } from '../errors/base';
import type { DownloadJobRow } from '../db/schema';
import { parsePagination } from '../utils/pagination';

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function downloadRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/downloads — enqueue a download for an existing iso_version
  fastify.post<{ Body: { versionId: string; priority?: number } }>('/api/downloads', {
    schema: {
      body: {
        type: 'object',
        required: ['versionId'],
        properties: {
          versionId: { type: 'string' },
          priority: { type: 'number', minimum: 1, maximum: 10 },
        },
      },
    },
    handler: async (request, reply) => {
      const { versionId, priority } = request.body;
      const job = await downloadManager.enqueue(versionId, priority);
      return reply.status(201).send(job);
    },
  });

  // GET /api/downloads — list jobs with optional status filter
  fastify.get<{
    Querystring: { status?: string; page?: string; limit?: string };
  }>('/api/downloads', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['queued', 'running', 'completed', 'failed', 'cancelled'],
          },
          page: { type: 'string', pattern: '^[1-9][0-9]*$' },
          limit: { type: 'string', pattern: '^[1-9][0-9]*$' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request, reply) => {
      const db = getDb();
      const { status } = request.query;
      const { page, limit, offset } = parsePagination(request.query);

      const where = status ? 'WHERE status = ?' : '';
      const bindings = status ? [status] : [];

      const { count } = db
        .prepare(`SELECT COUNT(*) as count FROM download_jobs ${where}`)
        .get(...bindings) as { count: number };

      const rows = db
        .prepare(
          `SELECT * FROM download_jobs ${where}
           ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        )
        .all(...bindings, limit, offset) as DownloadJobRow[];

      return reply.send({
        data: rows.map(rowToJob),
        total: count,
        page,
        limit,
      });
    },
  });

  // GET /api/downloads/:id — get a single job
  fastify.get<{ Params: { id: string } }>('/api/downloads/:id', {
    handler: async (request, reply) => {
      const row = getDb()
        .prepare(`SELECT * FROM download_jobs WHERE id = ?`)
        .get(request.params.id) as DownloadJobRow | undefined;

      if (!row) throw new NotFoundError('DownloadJob', request.params.id);
      return reply.send(rowToJob(row));
    },
  });

  // DELETE /api/downloads/:id — cancel a job
  fastify.delete<{ Params: { id: string } }>('/api/downloads/:id', {
    handler: async (request, reply) => {
      downloadManager.cancel(request.params.id);
      return reply.status(204).send();
    },
  });

  // GET /api/ws — WebSocket upgrade for live download progress
  fastify.get(
    '/api/ws',
    { websocket: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket: any) => {
      hub.register(socket);
      socket.on('close', () => hub.unregister(socket));
    },
  );
}
