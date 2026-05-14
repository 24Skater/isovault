import type { FastifyInstance } from 'fastify';
import {
  listDefinitions,
  getDefinition,
  createDefinition,
  updateDefinition,
  deleteDefinition,
} from '../services/iso';
import type { CreateDefinitionDto, UpdateDefinitionDto } from '../services/iso';

export async function definitionRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/definitions ──────────────────────────────────────────────────
  fastify.get('/api/definitions', async (request) => {
    const query = request.query as {
      family?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const result = listDefinitions({
      family: query.family,
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });

    return {
      data: result.definitions,
      total: result.total,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 50,
    };
  });

  // ── POST /api/definitions ─────────────────────────────────────────────────
  fastify.post('/api/definitions', async (request, reply) => {
    const body = request.body as CreateDefinitionDto;
    const definition = createDefinition(body);
    return reply.status(201).send(definition);
  });

  // ── GET /api/definitions/:id ──────────────────────────────────────────────
  fastify.get('/api/definitions/:id', async (request) => {
    const { id } = request.params as { id: string };
    return getDefinition(id);
  });

  // ── PUT /api/definitions/:id ──────────────────────────────────────────────
  fastify.put('/api/definitions/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as UpdateDefinitionDto;
    return updateDefinition(id, body);
  });

  // ── DELETE /api/definitions/:id ───────────────────────────────────────────
  fastify.delete('/api/definitions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    deleteDefinition(id);
    return reply.status(204).send();
  });
}
