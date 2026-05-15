import type { FastifyInstance } from 'fastify';
import {
  listWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  dispatch,
} from '../services/webhook';
import { NotFoundError, ValidationError } from '../errors/base';

export async function webhookRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/webhooks ──────────────────────────────────────────────────────
  fastify.get('/api/webhooks', async () => {
    return { data: listWebhooks() };
  });

  // ── POST /api/webhooks ─────────────────────────────────────────────────────
  fastify.post('/api/webhooks', async (request, reply) => {
    const body = request.body as {
      url?: unknown;
      secret?: unknown;
      events?: unknown;
      enabled?: unknown;
    };

    if (!body.url || typeof body.url !== 'string') {
      throw new ValidationError('body.url is required and must be a string', 'url');
    }
    if (!Array.isArray(body.events)) {
      throw new ValidationError('body.events must be an array of strings', 'events');
    }

    const webhook = createWebhook({
      url: body.url,
      secret: body.secret != null ? String(body.secret) : null,
      events: (body.events as unknown[]).map(String),
      enabled: body.enabled !== false,
    });

    return reply.status(201).send(webhook);
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

    const updated = updateWebhook(id, patch);
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
