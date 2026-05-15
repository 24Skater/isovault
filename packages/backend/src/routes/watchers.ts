import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/client';
import { watcherService } from '../services/watcher';
import { rowToDefinition } from '../services/iso';
import { NotFoundError } from '../errors/base';
import type { IsoDefinitionRow } from '../db/schema';

export async function watcherRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/watchers — all watch-enabled definitions with status fields
  fastify.get('/api/watchers', async (_request, reply) => {
    const rows = getDb()
      .prepare(
        `SELECT * FROM iso_definitions
         WHERE watch_enabled = 1
         ORDER BY family ASC, name ASC`,
      )
      .all() as IsoDefinitionRow[];

    return reply.send(rows.map(rowToDefinition));
  });

  // POST /api/definitions/:id/watch/trigger — manually trigger a watcher check
  fastify.post<{ Params: { id: string } }>(
    '/api/definitions/:id/watch/trigger',
    async (request, reply) => {
      const { id } = request.params;

      // Validate definition exists
      const row = getDb()
        .prepare('SELECT id, watch_enabled FROM iso_definitions WHERE id = ?')
        .get(id) as { id: string; watch_enabled: number } | undefined;

      if (!row) throw new NotFoundError('IsoDefinition', id);

      // Run the watcher (errors propagate as HTTP 500 via Fastify error handler)
      await watcherService.runOne(id);

      return reply.status(204).send();
    },
  );
}
