import type { FastifyInstance } from 'fastify';
import {
  listDefinitions,
  getDefinition,
  createDefinition,
  updateDefinition,
  deleteDefinition,
} from '../services/iso';
import type { CreateDefinitionDto, UpdateDefinitionDto } from '../services/iso';
import { parsePagination } from '../utils/pagination';

const paginationQuery = {
  type: 'object',
  properties: {
    page: { type: 'string', pattern: '^[1-9][0-9]*$' },
    limit: { type: 'string', pattern: '^[1-9][0-9]*$' },
  },
} as const;

const watchConfigSchema = {
  type: 'object',
  additionalProperties: true,
} as const;

const definitionBody = {
  type: 'object',
  required: ['name', 'family', 'architecture'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    family: { type: 'string', minLength: 1, maxLength: 100 },
    architecture: { type: 'string', minLength: 1, maxLength: 50 },
    description: { type: 'string', maxLength: 1000 },
    tags: { type: 'array', items: { type: 'string' }, maxItems: 20 },
    sourceUrl: { anyOf: [{ type: 'string', format: 'uri', maxLength: 2048 }, { type: 'null' }] },
    checksumUrl: { anyOf: [{ type: 'string', format: 'uri', maxLength: 2048 }, { type: 'null' }] },
    checksumAlgo: { type: 'string', enum: ['sha256', 'sha512', 'md5'] },
    retentionCount: { type: 'integer', minimum: 1, maximum: 100 },
    retentionBehavior: { type: 'string', enum: ['archive', 'delete'] },
    watchEnabled: { type: 'boolean' },
    watchStrategy: {
      type: 'string',
      enum: ['rss', 'html_scrape', 'json_api', 'checksum', 'filename'],
    },
    watchConfig: watchConfigSchema,
    watchIntervalMinutes: { type: 'integer', minimum: 1 },
  },
  additionalProperties: false,
} as const;

const updateBody = {
  ...definitionBody,
  required: [] as string[],
} as const;

export async function definitionRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/definitions ──────────────────────────────────────────────────
  fastify.get('/api/definitions', {
    schema: {
      querystring: {
        ...paginationQuery,
        properties: {
          ...paginationQuery.properties,
          family: { type: 'string', maxLength: 100 },
          search: { type: 'string', maxLength: 200 },
        },
      },
    },
    handler: async (request) => {
      const query = request.query as {
        family?: string;
        search?: string;
        page?: string;
        limit?: string;
      };

      const { page, limit } = parsePagination(query);
      const result = listDefinitions({ family: query.family, search: query.search, page, limit });

      return { data: result.definitions, total: result.total, page, limit };
    },
  });

  // ── POST /api/definitions ─────────────────────────────────────────────────
  fastify.post('/api/definitions', {
    schema: { body: definitionBody },
    handler: async (request, reply) => {
      const body = request.body as CreateDefinitionDto;
      const definition = createDefinition(body);
      return reply.status(201).send(definition);
    },
  });

  // ── GET /api/definitions/:id ──────────────────────────────────────────────
  fastify.get('/api/definitions/:id', async (request) => {
    const { id } = request.params as { id: string };
    return getDefinition(id);
  });

  // ── PUT /api/definitions/:id ──────────────────────────────────────────────
  fastify.put('/api/definitions/:id', {
    schema: { body: updateBody },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as UpdateDefinitionDto;
      return updateDefinition(id, body);
    },
  });

  // ── DELETE /api/definitions/:id ───────────────────────────────────────────
  fastify.delete('/api/definitions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    deleteDefinition(id);
    return reply.status(204).send();
  });
}
