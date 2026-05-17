import type { FastifyInstance } from 'fastify';
import {
  createIntegrationToken,
  listIntegrationTokens,
  revokeIntegrationToken,
  deleteIntegrationToken,
} from '../services/integrationTokens';
import { NotFoundError, ValidationError } from '../errors/base';

export async function integrationRoutes(fastify: FastifyInstance): Promise<void> {
  // List all tokens (never returns plaintext)
  fastify.get('/api/integrations/tokens', async (_request, reply) => {
    return reply.send(listIntegrationTokens());
  });

  // Create a new token — returns plaintext exactly once
  fastify.post<{ Body: { name?: unknown; description?: unknown } }>(
    '/api/integrations/tokens',
    async (request, reply) => {
      const { name, description } = request.body ?? {};
      if (!name || typeof name !== 'string' || !name.trim()) {
        throw new ValidationError('name is required', 'name');
      }
      if ((name as string).trim().length > 200) {
        throw new ValidationError('name must be 200 characters or fewer', 'name');
      }
      const token = await createIntegrationToken(
        name as string,
        typeof description === 'string' ? description : null,
      );
      return reply.status(201).send(token);
    },
  );

  // Revoke (soft-delete) a token
  fastify.patch<{ Params: { id: string } }>(
    '/api/integrations/tokens/:id/revoke',
    async (request, reply) => {
      const ok = revokeIntegrationToken(request.params.id);
      if (!ok) throw new NotFoundError('integration_token', request.params.id);
      return reply.status(204).send();
    },
  );

  // Hard-delete a token
  fastify.delete<{ Params: { id: string } }>(
    '/api/integrations/tokens/:id',
    async (request, reply) => {
      const ok = deleteIntegrationToken(request.params.id);
      if (!ok) throw new NotFoundError('integration_token', request.params.id);
      return reply.status(204).send();
    },
  );
}
