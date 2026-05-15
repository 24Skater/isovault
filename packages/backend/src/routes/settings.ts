import type { FastifyInstance } from 'fastify';
import { listSettings, setSetting } from '../services/settings';
import { NotFoundError, ValidationError } from '../errors/base';

const ALLOWED_KEYS = new Set([
  'max_concurrent_downloads',
  'default_retention_count',
  'default_retention_behavior',
  'storage_alert_threshold_percent',
  'log_retention_days',
]);

export async function settingsRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/settings ─────────────────────────────────────────────────────
  fastify.get('/api/settings', async () => {
    return { data: listSettings() };
  });

  // ── PUT /api/settings/:key ────────────────────────────────────────────────
  fastify.put('/api/settings/:key', async (request) => {
    const { key } = request.params as { key: string };
    const body = request.body as { value?: unknown };

    if (!ALLOWED_KEYS.has(key)) {
      throw new NotFoundError('Setting', key);
    }
    if (body.value === undefined || body.value === null) {
      throw new ValidationError('body.value is required');
    }

    const setting = setSetting(key, String(body.value));
    return setting;
  });
}
