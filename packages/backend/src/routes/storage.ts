import type { FastifyInstance } from 'fastify';
import { getStorageStats } from '../services/storage';

export async function storageRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/storage/stats ─────────────────────────────────────────────────
  fastify.get('/api/storage/stats', async () => {
    return getStorageStats();
  });
}
