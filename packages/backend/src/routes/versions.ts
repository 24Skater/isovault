import type { FastifyInstance } from 'fastify';
import { listVersions, getVersion } from '../services/iso';

export async function versionRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/definitions/:definitionId/versions ───────────────────────────
  fastify.get('/api/definitions/:definitionId/versions', async (request) => {
    const { definitionId } = request.params as { definitionId: string };
    const query = request.query as { page?: string; limit?: string };

    const result = listVersions(definitionId, {
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });

    return {
      data: result.versions,
      total: result.total,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 50,
    };
  });

  // ── GET /api/definitions/:definitionId/versions/:versionId ───────────────
  fastify.get('/api/definitions/:definitionId/versions/:versionId', async (request) => {
    const { definitionId, versionId } = request.params as {
      definitionId: string;
      versionId: string;
    };
    return getVersion(definitionId, versionId);
  });
}
