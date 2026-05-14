import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fs from 'fs';
import { getDb } from '../db/client';
import config from '../config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version } = require('../../package.json') as { version: string };

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  /** Liveness — always 200 if the process is running */
  fastify.get('/health', async (_req: FastifyRequest, _reply: FastifyReply) => {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      version,
      timestamp: new Date().toISOString(),
    };
  });

  /** Readiness — 503 if DB or storage is unavailable */
  fastify.get('/ready', async (_req: FastifyRequest, reply: FastifyReply) => {
    const checks: Record<string, string> = {};

    // Check database
    try {
      const db = getDb();
      db.prepare('SELECT 1').get();
      checks['database'] = 'ok';
    } catch {
      checks['database'] = 'unavailable';
    }

    // Check storage path is accessible
    try {
      fs.accessSync(config.storage.path, fs.constants.W_OK);
      checks['storage'] = 'ok';
    } catch {
      // Storage path may not exist yet — not fatal at startup
      checks['storage'] = 'not_found';
    }

    const allOk = Object.values(checks).every((v) => v === 'ok' || v === 'not_found');

    if (!allOk) {
      return reply.status(503).send({
        status: 'not_ready',
        checks,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ready',
      checks,
      version,
      timestamp: new Date().toISOString(),
    };
  });
}
