import type { FastifyInstance } from 'fastify';
import {
  listWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  dispatch,
  WEBHOOK_EVENTS,
} from '../services/webhook';
import { NotFoundError } from '../errors/base';

export async function webhookRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/webhooks ──────────────────────────────────────────────────────
  fastify.get('/api/webhooks', async () => {
    return { data: listWebhooks() };
  });

  // ── POST /api/webhooks ─────────────────────────────────────────────────────
  fastify.post('/api/webhooks', {
    schema: {
      body: {
        type: 'object',
        required: ['url', 'events'],
        properties: {
          url: { type: 'string', format: 'uri', maxLength: 2048 },
          secret: { type: 'string', maxLength: 512 },
          events: {
            type: 'array',
            items: { type: 'string', enum: [...WEBHOOK_EVENTS] },
            minItems: 1,
            maxItems: 20,
          },
          enabled: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request, reply) => {
      const body = request.body as {
        url: string;
        secret?: string;
        events: string[];
        enabled?: boolean;
      };

      const webhook = await createWebhook({
        url: body.url,
        secret: body.secret ?? null,
        events: body.events,
        enabled: body.enabled !== false,
      });

      return reply.status(201).send(webhook);
    },
  });

  // ── GET /api/webhooks/:id ─────────────────────────────────────────────────
  fastify.get('/api/webhooks/:id', async (request) => {
    const { id } = request.params as { id: string };
    const webhook = getWebhook(id);
    if (!webhook) throw new NotFoundError('Webhook', id);
    return webhook;
  });

  // ── PATCH /api/webhooks/:id ───────────────────────────────────────────────
  fastify.patch('/api/webhooks/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const patch: Parameters<typeof updateWebhook>[1] = {};
    if ('url' in body) patch.url = String(body['url']);
    if ('secret' in body) patch.secret = body['secret'] != null ? String(body['secret']) : null;
    if ('events' in body && Array.isArray(body['events'])) {
      patch.events = (body['events'] as unknown[]).map(String);
    }
    if ('enabled' in body) patch.enabled = Boolean(body['enabled']);

    const updated = await updateWebhook(id, patch);
    if (!updated) throw new NotFoundError('Webhook', id);
    return updated;
  });

  // ── DELETE /api/webhooks/:id ──────────────────────────────────────────────
  fastify.delete('/api/webhooks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = deleteWebhook(id);
    if (!deleted) throw new NotFoundError('Webhook', id);
    return reply.status(204).send();
  });

  // ── POST /api/webhooks/:id/test ───────────────────────────────────────────
  fastify.post('/api/webhooks/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    const webhook = getWebhook(id);
    if (!webhook) throw new NotFoundError('Webhook', id);

    await dispatch('webhook.test', { webhookId: id });
    return reply.status(200).send({ ok: true });
  });
}
