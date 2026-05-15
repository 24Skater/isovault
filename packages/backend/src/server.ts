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
import { IsoManagerError } from './errors/base';

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

  // ── Routes ───────────────────────────────────────────────────────────────────

  await server.register(healthRoutes);
  await server.register(definitionRoutes);
  await server.register(versionRoutes);
  await server.register(downloadRoutes);
  await server.register(watcherRoutes);

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

async function start(): Promise<void> {
  // Initialise database (runs migrations)
  try {
    initDb(config.database.path);
    console.log(`[db] Database ready at ${config.database.path}`);
  } catch (err) {
    console.error('[db] Failed to initialise database:', err);
    process.exit(1);
  }

  downloadManager.recoverStaleJobs();
  downloadManager.startPolling();
  scheduler.start();

  const server = await buildServer();

  try {
    await server.listen({ port: config.server.port, host: config.server.host });
    server.log.info(
      { port: config.server.port, host: config.server.host },
      'isovault server started',
    );
  } catch (err) {
    server.log.fatal(err, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  const server = await buildServer();
  await server.close();
  process.exit(0);
});

start();
