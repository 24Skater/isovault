import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocketPlugin from '@fastify/websocket';
import path from 'path';
import os from 'os';
import config from './config';
import { initDb } from './db/client';
import { healthRoutes } from './routes/health';
import { definitionRoutes } from './routes/definitions';
import { versionRoutes } from './routes/versions';
import { downloadRoutes } from './routes/downloads';
import { downloadManager } from './services/download';
import { scheduler } from './scheduler/cron';
import { watcherRoutes } from './routes/watchers';
import { auditRoutes } from './routes/audit';
import { settingsRoutes } from './routes/settings';
import { storageRoutes } from './routes/storage';
import { webhookRoutes } from './routes/webhooks';
import { statsRoutes } from './routes/stats';
import { IsoManagerError } from './errors/base';
import { initApiKey, verifyApiKey } from './services/auth';

// ─── Build server ─────────────────────────────────────────────────────────────

export async function buildServer(): Promise<FastifyInstance> {
  const isDev = process.env['NODE_ENV'] !== 'production';

  const server = Fastify({
    logger: {
      level: config.logging.level,
      ...(isDev
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
            },
          }
        : {}),
      redact: ['req.headers.authorization'],
      base: {
        service: 'isovault',
        version: process.env['npm_package_version'] ?? 'unknown',
        hostname: os.hostname(),
        pid: process.pid,
      },
    },
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
  });

  // ── Plugins ─────────────────────────────────────────────────────────────────

  await server.register(cors, {
    origin: config.server.corsOrigins,
    credentials: true,
  });

  await server.register(websocketPlugin);

  // Serve frontend static files in production
  if (!isDev) {
    const staticPlugin = await import('@fastify/static');
    await server.register(staticPlugin.default, {
      root: path.join(__dirname, '../../frontend/dist'),
      prefix: '/',
    });
  }

  // ── Auth hook ────────────────────────────────────────────────────────────────

  const PUBLIC_PATHS = new Set(['/health', '/ready', '/api/health']);
  server.addHook('onRequest', async (request, reply) => {
    const pathname = request.url.split('?')[0];
    if (PUBLIC_PATHS.has(pathname)) return;
    const header = request.headers['authorization'] ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token || !(await verifyApiKey(token))) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // ── Routes ───────────────────────────────────────────────────────────────────

  await server.register(healthRoutes);
  await server.register(definitionRoutes);
  await server.register(versionRoutes);
  await server.register(downloadRoutes);
  await server.register(watcherRoutes);
  await server.register(auditRoutes);
  await server.register(settingsRoutes);
  await server.register(storageRoutes);
  await server.register(webhookRoutes);
  await server.register(statsRoutes);

  // ── Global error handler (RFC 7807) ─────────────────────────────────────────

  server.setErrorHandler((error, request, reply) => {
    const requestId = request.id as string;

    if (error instanceof IsoManagerError) {
      request.log.warn({ err: error.toJSON(), requestId, path: request.url }, 'api.request_error');
      return reply.status(error.statusCode).send({
        type: `https://isovault.local/errors/${error.code.toLowerCase()}`,
        title: error.code,
        status: error.statusCode,
        detail: error.message,
        requestId,
        ...(isDev ? { context: error.context } : {}),
      });
    }

    // Fastify validation errors (schema mismatch)
    if (error.validation) {
      return reply.status(400).send({
        type: 'https://isovault.local/errors/validation_error',
        title: 'VALIDATION_ERROR',
        status: 400,
        detail: error.message,
        requestId,
      });
    }

    request.log.error(
      { err: { message: error.message, stack: error.stack }, requestId, path: request.url },
      'api.unhandled_error',
    );

    return reply.status(500).send({
      type: 'https://isovault.local/errors/internal_error',
      title: 'INTERNAL_ERROR',
      status: 500,
      detail: isDev ? error.message : 'An unexpected error occurred.',
      requestId,
    });
  });

  server.addHook('onClose', (_instance, done) => {
    const { closeDb } = require('./db/client') as typeof import('./db/client');
    downloadManager.stopPolling();
    scheduler.stop();
    closeDb();
    done();
  });

  return server;
}

// ─── Start ────────────────────────────────────────────────────────────────────

let _runningServer: FastifyInstance | null = null;

async function start(): Promise<void> {
  // Initialise database (runs migrations)
  try {
    initDb(config.database.path);
    console.log(`[db] Database ready at ${config.database.path}`);
  } catch (err) {
    console.error('[db] Failed to initialise database:', err);
    process.exit(1);
  }

  await initApiKey();

  downloadManager.recoverStaleJobs();
  downloadManager.startPolling();
  scheduler.start();

  _runningServer = await buildServer();

  try {
    await _runningServer.listen({ port: config.server.port, host: config.server.host });
    _runningServer.log.info(
      { port: config.server.port, host: config.server.host },
      'isovault server started',
    );
  } catch (err) {
    _runningServer.log.fatal(err, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (_runningServer) await _runningServer.close();
  process.exit(0);
});

start();
