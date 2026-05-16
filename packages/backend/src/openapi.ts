/* Complete OpenAPI 3.0 specification for IsoVault. Used in static mode — no per-route schemas needed. */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'IsoVault',
    description:
      'REST API for IsoVault — self-hosted ISO lifecycle management.\n\n' +
      'All endpoints except `GET /health` and `GET /ready` require a Bearer token:\n\n' +
      '```\nAuthorization: Bearer <api-key>\n```\n\n' +
      'The key is auto-generated on first boot and printed to stdout. ' +
      'Set `ISO_MANAGER_API_KEY` to use a fixed value.',
    version: '1.0.0',
    license: {
      name: 'MIT',
      url: 'https://github.com/24Skater/isovault/blob/main/LICENSE',
    },
    contact: {
      name: 'IsoVault on GitHub',
      url: 'https://github.com/24Skater/isovault',
    },
  },
  externalDocs: {
    description: 'Full documentation',
    url: 'https://github.com/24Skater/isovault#readme',
  },
  servers: [{ url: 'http://localhost:3721', description: 'Local / Docker Compose' }],
  tags: [
    { name: 'system', description: 'Health probes and runtime statistics' },
    { name: 'definitions', description: 'ISO definition CRUD and watcher management' },
    {
      name: 'versions',
      description: 'ISO version lifecycle — archive, activate, download, verify',
    },
    { name: 'downloads', description: 'Download queue management' },
    { name: 'webhooks', description: 'Signed webhook delivery' },
    { name: 'audit', description: 'Structured audit log' },
    { name: 'settings', description: 'Runtime configuration' },
    { name: 'storage', description: 'Disk usage statistics' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description:
          'Generated on first boot and printed once to stdout. ' +
          'Override via `ISO_MANAGER_API_KEY` env var.',
      },
    },
    schemas: {
      // ── Enums ────────────────────────────────────────────────────────────────
      IsoStatus: {
        type: 'string',
        enum: ['pending', 'downloading', 'active', 'archived', 'corrupt', 'deleted'],
      },
      DownloadJobStatus: {
        type: 'string',
        enum: ['queued', 'running', 'paused', 'completed', 'failed', 'cancelled'],
      },
      RetentionBehavior: {
        type: 'string',
        enum: ['archive', 'delete'],
      },
      WatchStrategy: {
        type: 'string',
        enum: ['rss', 'html_scrape', 'json_api', 'checksum', 'filename'],
      },
      ChecksumAlgorithm: {
        type: 'string',
        enum: ['sha256', 'sha512', 'md5'],
      },
      AuditSeverity: {
        type: 'string',
        enum: ['info', 'warn', 'error', 'critical'],
      },

      // ── Domain objects ───────────────────────────────────────────────────────
      IsoDefinition: {
        type: 'object',
        required: [
          'id',
          'name',
          'family',
          'architecture',
          'checksumAlgo',
          'retentionCount',
          'retentionBehavior',
          'watchEnabled',
          'watchIntervalMinutes',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'string', format: 'uuid', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
          name: { type: 'string', example: 'Ubuntu 24.04 LTS' },
          family: { type: 'string', example: 'ubuntu' },
          architecture: { type: 'string', example: 'x86_64' },
          description: { type: 'string', nullable: true },
          tags: { type: 'array', items: { type: 'string' }, example: ['linux', 'debian-based'] },
          sourceUrl: { type: 'string', nullable: true, format: 'uri' },
          checksumUrl: { type: 'string', nullable: true, format: 'uri' },
          checksumAlgo: { $ref: '#/components/schemas/ChecksumAlgorithm' },
          retentionCount: { type: 'integer', minimum: 1, example: 3 },
          retentionBehavior: { $ref: '#/components/schemas/RetentionBehavior' },
          watchEnabled: { type: 'boolean', example: true },
          watchStrategy: {
            allOf: [{ $ref: '#/components/schemas/WatchStrategy' }],
            nullable: true,
          },
          watchConfig: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
            example: {
              pageUrl: 'https://releases.ubuntu.com/noble/',
              versionSelector: 'h1',
              downloadLinkSelector: 'a[href$=".iso"]',
            },
          },
          watchIntervalMinutes: { type: 'integer', minimum: 1, example: 1440 },
          watchLastCheckedAt: { type: 'string', format: 'date-time', nullable: true },
          watchLastVersionFound: { type: 'string', nullable: true, example: '24.04.2' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      IsoVersion: {
        type: 'object',
        required: [
          'id',
          'definitionId',
          'versionString',
          'filename',
          'filePath',
          'checksumVerified',
          'status',
          'sourceUrl',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'string', format: 'uuid' },
          definitionId: { type: 'string', format: 'uuid' },
          versionString: { type: 'string', example: '24.04.2' },
          releaseDate: { type: 'string', format: 'date', nullable: true },
          filename: { type: 'string', example: 'ubuntu-24.04.2-desktop-amd64.iso' },
          filePath: {
            type: 'string',
            example: '/data/iso-store/ubuntu/ubuntu-24.04.2-desktop-amd64.iso',
          },
          fileSizeBytes: { type: 'integer', nullable: true, example: 2097152000 },
          checksum: { type: 'string', nullable: true, example: 'a1b2c3d4...' },
          checksumVerified: { type: 'boolean' },
          status: { $ref: '#/components/schemas/IsoStatus' },
          sourceUrl: { type: 'string', format: 'uri' },
          downloadStartedAt: { type: 'string', format: 'date-time', nullable: true },
          downloadCompletedAt: { type: 'string', format: 'date-time', nullable: true },
          archivedAt: { type: 'string', format: 'date-time', nullable: true },
          notes: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      DownloadJob: {
        type: 'object',
        required: [
          'id',
          'versionId',
          'status',
          'priority',
          'attemptCount',
          'maxAttempts',
          'bytesDownloaded',
          'createdAt',
        ],
        properties: {
          id: { type: 'string', format: 'uuid' },
          versionId: { type: 'string', format: 'uuid' },
          status: { $ref: '#/components/schemas/DownloadJobStatus' },
          priority: { type: 'integer', minimum: 1, maximum: 10, example: 5 },
          attemptCount: { type: 'integer', example: 1 },
          maxAttempts: { type: 'integer', example: 3 },
          bytesDownloaded: { type: 'integer', example: 104857600 },
          bytesTotal: { type: 'integer', nullable: true, example: 2097152000 },
          errorMessage: { type: 'string', nullable: true },
          startedAt: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      AuditLogEntry: {
        type: 'object',
        required: ['id', 'eventType', 'severity', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          eventType: { type: 'string', example: 'download.completed' },
          entityType: { type: 'string', nullable: true, example: 'version' },
          entityId: { type: 'string', nullable: true, format: 'uuid' },
          payload: { type: 'object', nullable: true, additionalProperties: true },
          severity: { $ref: '#/components/schemas/AuditSeverity' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      Webhook: {
        type: 'object',
        required: ['id', 'url', 'events', 'enabled', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: {
            type: 'string',
            format: 'uri',
            example: 'https://your-server.example.com/hooks/isovault',
          },
          secret: {
            type: 'string',
            nullable: true,
            description: 'HMAC secret — present in creation response only, redacted thereafter',
          },
          events: {
            type: 'array',
            items: { type: 'string' },
            example: ['download.completed', 'integrity.failed'],
          },
          enabled: { type: 'boolean' },
          lastFiredAt: { type: 'string', format: 'date-time', nullable: true },
          lastStatusCode: { type: 'integer', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      AppSetting: {
        type: 'object',
        required: ['key', 'value', 'updatedAt'],
        properties: {
          key: { type: 'string', example: 'max_concurrent_downloads' },
          value: { type: 'string', example: '3' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      StorageStats: {
        type: 'object',
        properties: {
          usedBytes: { type: 'integer', example: 10737418240 },
          freeBytes: { type: 'integer', example: 512110190592 },
          totalBytes: { type: 'integer', example: 512110190592 },
          alertThresholdPercent: { type: 'integer', example: 80 },
        },
      },

      // ── Error (RFC 7807) ─────────────────────────────────────────────────────
      ProblemDetail: {
        type: 'object',
        required: ['type', 'title', 'status', 'detail', 'requestId'],
        properties: {
          type: {
            type: 'string',
            format: 'uri',
            example: 'https://isovault.local/errors/not_found',
          },
          title: { type: 'string', example: 'NOT_FOUND' },
          status: { type: 'integer', example: 404 },
          detail: { type: 'string', example: 'IsoDefinition abc-123 does not exist' },
          requestId: { type: 'string', example: 'req-7f3a1b2c' },
        },
      },

      // ── Paginated wrappers ───────────────────────────────────────────────────
      PaginatedDefinitions: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/IsoDefinition' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
        },
      },
      PaginatedVersions: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/IsoVersion' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
        },
      },
      PaginatedDownloadJobs: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/DownloadJob' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
        },
      },
      PaginatedAuditLog: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/AuditLogEntry' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
        },
      },

      // ── Request bodies ───────────────────────────────────────────────────────
      CreateDefinitionBody: {
        type: 'object',
        required: ['name', 'family', 'architecture'],
        properties: {
          name: { type: 'string', example: 'Ubuntu 24.04 LTS' },
          family: { type: 'string', example: 'ubuntu' },
          architecture: { type: 'string', example: 'x86_64' },
          description: { type: 'string', nullable: true },
          tags: { type: 'array', items: { type: 'string' }, example: ['linux', 'debian-based'] },
          sourceUrl: { type: 'string', nullable: true, format: 'uri' },
          checksumUrl: { type: 'string', nullable: true, format: 'uri' },
          checksumAlgo: { $ref: '#/components/schemas/ChecksumAlgorithm', default: 'sha256' },
          retentionCount: { type: 'integer', minimum: 1, default: 5, example: 3 },
          retentionBehavior: { $ref: '#/components/schemas/RetentionBehavior', default: 'archive' },
          watchEnabled: { type: 'boolean', default: false },
          watchStrategy: {
            allOf: [{ $ref: '#/components/schemas/WatchStrategy' }],
            nullable: true,
          },
          watchConfig: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
            description:
              'Strategy-specific configuration object. Shape depends on `watchStrategy`.',
          },
          watchIntervalMinutes: { type: 'integer', minimum: 1, default: 1440, example: 1440 },
        },
      },

      UpdateDefinitionBody: {
        type: 'object',
        description: 'All fields optional — only provided fields are updated.',
        properties: {
          name: { type: 'string' },
          family: { type: 'string' },
          architecture: { type: 'string' },
          description: { type: 'string', nullable: true },
          tags: { type: 'array', items: { type: 'string' } },
          sourceUrl: { type: 'string', nullable: true, format: 'uri' },
          checksumUrl: { type: 'string', nullable: true, format: 'uri' },
          checksumAlgo: { $ref: '#/components/schemas/ChecksumAlgorithm' },
          retentionCount: { type: 'integer', minimum: 1 },
          retentionBehavior: { $ref: '#/components/schemas/RetentionBehavior' },
          watchEnabled: { type: 'boolean' },
          watchStrategy: {
            allOf: [{ $ref: '#/components/schemas/WatchStrategy' }],
            nullable: true,
          },
          watchConfig: { type: 'object', nullable: true, additionalProperties: true },
          watchIntervalMinutes: { type: 'integer', minimum: 1 },
        },
      },

      CreateWebhookBody: {
        type: 'object',
        required: ['url', 'events'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            example: 'https://your-server.example.com/hooks/isovault',
          },
          secret: {
            type: 'string',
            description: 'HMAC-SHA256 signing secret for payload verification',
          },
          events: {
            type: 'array',
            items: { type: 'string' },
            example: ['download.completed', 'integrity.failed', 'version.detected'],
          },
          enabled: { type: 'boolean', default: true },
        },
      },

      PatchWebhookBody: {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' },
          secret: { type: 'string', nullable: true },
          events: { type: 'array', items: { type: 'string' } },
          enabled: { type: 'boolean' },
        },
      },
    },

    parameters: {
      pageParam: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', minimum: 1, default: 1 },
        description: 'Page number (1-based)',
      },
      limitParam: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        description: 'Items per page',
      },
    },

    responses: {
      Unauthorized: {
        description: 'Missing or invalid Bearer token',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ProblemDetail' },
            example: {
              type: 'https://httpstatuses.com/401',
              title: 'Unauthorized',
              status: 401,
              detail: 'Unauthorized',
              requestId: 'req-abc123',
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ProblemDetail' },
          },
        },
      },
      NoContent: {
        description: 'Operation successful, no body returned',
      },
    },
  },

  security: [{ bearerAuth: [] }],

  paths: {
    // ── System ─────────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['system'],
        summary: 'Liveness check',
        description: 'Returns 200 while the process is running. No auth required.',
        security: [],
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Process is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', example: 'ok' } },
                },
              },
            },
          },
        },
      },
    },

    '/ready': {
      get: {
        tags: ['system'],
        summary: 'Readiness check',
        description:
          'Returns 200 when the database and storage are reachable; 503 otherwise. No auth required.',
        security: [],
        operationId: 'getReady',
        responses: {
          '200': {
            description: 'Service is ready',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', example: 'ok' } },
                },
              },
            },
          },
          '503': { description: 'Service unavailable — DB or storage unreachable' },
        },
      },
    },

    '/api/stats': {
      get: {
        tags: ['system'],
        summary: 'Dashboard statistics',
        description:
          'Aggregated counts for definitions, versions, and active downloads, plus storage usage and the five most recent audit events.',
        operationId: 'getStats',
        responses: {
          '200': {
            description: 'Stats payload',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    definitions: { type: 'integer' },
                    versions: {
                      type: 'object',
                      properties: {
                        active: { type: 'integer' },
                        archived: { type: 'integer' },
                      },
                    },
                    downloads: {
                      type: 'object',
                      properties: {
                        running: { type: 'integer' },
                        queued: { type: 'integer' },
                      },
                    },
                    storage: { $ref: '#/components/schemas/StorageStats' },
                    recentEvents: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/AuditLogEntry' },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Definitions ────────────────────────────────────────────────────────────
    '/api/definitions': {
      get: {
        tags: ['definitions'],
        summary: 'List ISO definitions',
        operationId: 'listDefinitions',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          {
            name: 'family',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by OS family (e.g. `ubuntu`, `fedora`)',
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Full-text search across name, family, and architecture',
          },
        ],
        responses: {
          '200': {
            description: 'Paginated list of definitions',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PaginatedDefinitions' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['definitions'],
        summary: 'Create an ISO definition',
        operationId: 'createDefinition',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateDefinitionBody' } },
          },
        },
        responses: {
          '201': {
            description: 'Definition created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/IsoDefinition' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/definitions/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      get: {
        tags: ['definitions'],
        summary: 'Get a single definition',
        operationId: 'getDefinition',
        responses: {
          '200': {
            description: 'Definition object',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/IsoDefinition' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['definitions'],
        summary: 'Update a definition',
        description: 'Partial update — omitted fields are left unchanged.',
        operationId: 'updateDefinition',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateDefinitionBody' } },
          },
        },
        responses: {
          '200': {
            description: 'Updated definition',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/IsoDefinition' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['definitions'],
        summary: 'Delete a definition',
        description:
          'Deletes the definition and all associated version records. ISO files on disk are removed.',
        operationId: 'deleteDefinition',
        responses: {
          '204': { $ref: '#/components/responses/NoContent' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/definitions/{definitionId}/versions/import': {
      post: {
        tags: ['versions'],
        summary: 'Import an existing ISO',
        description:
          'Register an ISO you already have — no download required.\n\n' +
          '**Two modes, detected from `Content-Type`:**\n\n' +
          '- `multipart/form-data` — upload the file directly from your machine\n' +
          '- `application/json` — point to a file path already accessible on the server\n\n' +
          'Both modes copy the file into the ISO store, compute its checksum, and create ' +
          'an `active` version immediately — no download queue is involved.\n\n' +
          '**Multipart fields:** `versionString` (required), `file` (required), `filename`, `checksum`, `releaseDate`, `notes`\n\n' +
          '**JSON fields:** `sourcePath` (required), `versionString` (required), `filename`, `checksum`, `releaseDate`, `notes`',
        operationId: 'importVersion',
        parameters: [
          {
            name: 'definitionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'versionString'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'The ISO file' },
                  versionString: { type: 'string', example: '24.04.2' },
                  filename: {
                    type: 'string',
                    description: 'Override the stored filename (defaults to uploaded filename)',
                  },
                  checksum: {
                    type: 'string',
                    description: 'Expected checksum (hex). Verified before accepting the file.',
                  },
                  releaseDate: { type: 'string', format: 'date', example: '2024-04-25' },
                  notes: { type: 'string' },
                },
              },
            },
            'application/json': {
              schema: {
                type: 'object',
                required: ['sourcePath', 'versionString'],
                properties: {
                  sourcePath: {
                    type: 'string',
                    description: 'Absolute path to the ISO file on the server filesystem',
                    example: '/mnt/nas/isos/ubuntu-24.04.2-desktop-amd64.iso',
                  },
                  versionString: { type: 'string', example: '24.04.2' },
                  filename: {
                    type: 'string',
                    description: 'Override stored filename (defaults to basename of sourcePath)',
                  },
                  checksum: {
                    type: 'string',
                    description: 'Expected checksum (hex). Verified before accepting the file.',
                  },
                  releaseDate: { type: 'string', format: 'date', example: '2024-04-25' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Version imported and marked active',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/IsoVersion' } },
            },
          },
          '400': {
            description: 'Validation error (missing fields, bad checksum, filename conflict)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/definitions/{id}/watch/trigger': {
      post: {
        tags: ['definitions'],
        summary: 'Trigger a watcher check',
        description:
          'Immediately runs the version-detection watcher for this definition, regardless of schedule.',
        operationId: 'triggerWatcher',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { $ref: '#/components/responses/NoContent' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Versions (scoped) ──────────────────────────────────────────────────────
    '/api/definitions/{definitionId}/versions': {
      get: {
        tags: ['versions'],
        summary: 'List versions for a definition',
        operationId: 'listDefinitionVersions',
        parameters: [
          {
            name: 'definitionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          '200': {
            description: 'Paginated version list',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PaginatedVersions' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/definitions/{definitionId}/versions/{versionId}': {
      get: {
        tags: ['versions'],
        summary: 'Get a specific version',
        operationId: 'getDefinitionVersion',
        parameters: [
          {
            name: 'definitionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'versionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Version object',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/IsoVersion' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Versions (cross-definition) ────────────────────────────────────────────
    '/api/versions': {
      get: {
        tags: ['versions'],
        summary: 'Cross-definition version query',
        operationId: 'listVersions',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          {
            name: 'status',
            in: 'query',
            schema: { $ref: '#/components/schemas/IsoStatus' },
            description: 'Filter by version status',
          },
        ],
        responses: {
          '200': {
            description:
              'Paginated version list with `definitionName` and `definitionFamily` fields added',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PaginatedVersions' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/versions/{id}/download': {
      get: {
        tags: ['versions'],
        summary: 'Download an ISO file',
        description:
          'Streams the ISO file as an octet-stream with `Content-Disposition: attachment`.',
        operationId: 'downloadVersion',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'ISO file stream',
            content: {
              'application/octet-stream': { schema: { type: 'string', format: 'binary' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/versions/{id}/verify': {
      get: {
        tags: ['versions'],
        summary: 'Re-verify checksum',
        description:
          'Re-computes the checksum of the stored file and compares it against the recorded value.',
        operationId: 'verifyVersion',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Verification result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    verified: { type: 'boolean' },
                    stored: { type: 'string', nullable: true },
                    computed: { type: 'string' },
                    checkedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '422': {
            description: 'ISO file not present on disk',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' } },
            },
          },
        },
      },
    },

    '/api/versions/{id}/archive': {
      patch: {
        tags: ['versions'],
        summary: 'Archive a version',
        description: 'Moves an `active` version to `archived` status. The file remains on disk.',
        operationId: 'archiveVersion',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Updated version',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/IsoVersion' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/versions/{id}/activate': {
      patch: {
        tags: ['versions'],
        summary: 'Restore an archived version',
        description: 'Moves an `archived` version back to `active` status.',
        operationId: 'activateVersion',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Updated version',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/IsoVersion' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/versions/{id}': {
      delete: {
        tags: ['versions'],
        summary: 'Permanently delete a version',
        description:
          'Removes the version record and the ISO file from disk. This operation cannot be undone.',
        operationId: 'deleteVersion',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { $ref: '#/components/responses/NoContent' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Downloads ──────────────────────────────────────────────────────────────
    '/api/downloads': {
      get: {
        tags: ['downloads'],
        summary: 'List download jobs',
        operationId: 'listDownloads',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          {
            name: 'status',
            in: 'query',
            schema: { $ref: '#/components/schemas/DownloadJobStatus' },
            description: 'Filter by job status',
          },
        ],
        responses: {
          '200': {
            description: 'Paginated list of download jobs',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaginatedDownloadJobs' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['downloads'],
        summary: 'Trigger a manual download',
        description:
          'Enqueues an existing version for download. The version must already exist and have a `sourceUrl`.',
        operationId: 'createDownload',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['versionId'],
                properties: {
                  versionId: { type: 'string', format: 'uuid' },
                  priority: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10,
                    default: 5,
                    description: 'Higher priority jobs are processed first',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Download job created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DownloadJob' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/downloads/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      get: {
        tags: ['downloads'],
        summary: 'Get a download job',
        operationId: 'getDownload',
        responses: {
          '200': {
            description: 'Download job',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DownloadJob' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['downloads'],
        summary: 'Cancel a download',
        description:
          'Cancels a queued or running download job. Completed or failed jobs cannot be cancelled.',
        operationId: 'cancelDownload',
        responses: {
          '204': { $ref: '#/components/responses/NoContent' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Watchers ───────────────────────────────────────────────────────────────
    '/api/watchers': {
      get: {
        tags: ['definitions'],
        summary: 'List active watchers',
        description:
          'Returns all definitions that have `watchEnabled: true`, ordered by family then name.',
        operationId: 'listWatchers',
        responses: {
          '200': {
            description: 'List of watch-enabled definitions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/IsoDefinition' } },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Webhooks ───────────────────────────────────────────────────────────────
    '/api/webhooks': {
      get: {
        tags: ['webhooks'],
        summary: 'List webhooks',
        operationId: 'listWebhooks',
        responses: {
          '200': {
            description: 'All registered webhooks',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Webhook' } },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['webhooks'],
        summary: 'Register a webhook',
        operationId: 'createWebhook',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateWebhookBody' } },
          },
        },
        responses: {
          '201': {
            description: 'Webhook registered',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Webhook' } } },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/webhooks/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      get: {
        tags: ['webhooks'],
        summary: 'Get a webhook',
        operationId: 'getWebhook',
        responses: {
          '200': {
            description: 'Webhook object',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Webhook' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['webhooks'],
        summary: 'Update a webhook',
        operationId: 'updateWebhook',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/PatchWebhookBody' } },
          },
        },
        responses: {
          '200': {
            description: 'Updated webhook',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Webhook' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['webhooks'],
        summary: 'Delete a webhook',
        operationId: 'deleteWebhook',
        responses: {
          '204': { $ref: '#/components/responses/NoContent' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/webhooks/{id}/test': {
      post: {
        tags: ['webhooks'],
        summary: 'Send a test event',
        description: 'Fires a `webhook.test` event to the webhook endpoint to verify delivery.',
        operationId: 'testWebhook',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Test event dispatched',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { ok: { type: 'boolean', example: true } } },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Audit ──────────────────────────────────────────────────────────────────
    '/api/audit': {
      get: {
        tags: ['audit'],
        summary: 'Query audit log',
        operationId: 'listAuditEvents',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          {
            name: 'severity',
            in: 'query',
            schema: { $ref: '#/components/schemas/AuditSeverity' },
          },
          {
            name: 'eventType',
            in: 'query',
            schema: { type: 'string' },
            example: 'download.failed',
            description: 'Exact event type to filter on',
          },
          {
            name: 'entityType',
            in: 'query',
            schema: { type: 'string' },
            description: 'Entity type to filter on (e.g. `version`, `definition`)',
          },
          {
            name: 'entityId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
            description: 'Entity ID to filter on',
          },
        ],
        responses: {
          '200': {
            description: 'Paginated audit log',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PaginatedAuditLog' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Settings ───────────────────────────────────────────────────────────────
    '/api/settings': {
      get: {
        tags: ['settings'],
        summary: 'List all runtime settings',
        operationId: 'listSettings',
        responses: {
          '200': {
            description: 'All settings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/AppSetting' } },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/settings/{key}': {
      put: {
        tags: ['settings'],
        summary: 'Update a runtime setting',
        description:
          'Allowed keys: `max_concurrent_downloads`, `default_retention_count`, `default_retention_behavior`, `storage_alert_threshold_percent`, `log_retention_days`.',
        operationId: 'updateSetting',
        parameters: [
          {
            name: 'key',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'max_concurrent_downloads',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['value'],
                properties: {
                  value: {
                    type: 'string',
                    description: 'New setting value (always stored as string)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated setting',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AppSetting' } },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ProblemDetail' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Storage ────────────────────────────────────────────────────────────────
    '/api/storage/stats': {
      get: {
        tags: ['storage'],
        summary: 'Disk usage for the ISO store',
        operationId: 'getStorageStats',
        responses: {
          '200': {
            description: 'Storage statistics',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/StorageStats' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
} as const;
