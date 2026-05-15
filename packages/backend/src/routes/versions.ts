import type { FastifyInstance } from 'fastify';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { listVersions, getVersion, rowToVersion } from '../services/iso';
import { NotFoundError, ValidationError } from '../errors/base';
import { getDb } from '../db/client';
import type { IsoVersionRow, IsoDefinitionRow } from '../db/schema';
import type { ChecksumAlgorithm } from '../types';
import { logEvent } from '../services/audit';
import { deleteFile } from '../services/storage';
import { computeFileChecksum } from '../utils/checksum';

export async function versionRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/definitions/:definitionId/versions ───────────────────────────
  fastify.get('/api/definitions/:definitionId/versions', async (request) => {
    const { definitionId } = request.params as { definitionId: string };
    const query = request.query as { page?: string; limit?: string };

    const result = listVersions(definitionId, {
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });

    return {
      data: result.versions,
      total: result.total,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 50,
    };
  });

  // ── GET /api/definitions/:definitionId/versions/:versionId ───────────────
  fastify.get('/api/definitions/:definitionId/versions/:versionId', async (request) => {
    const { definitionId, versionId } = request.params as {
      definitionId: string;
      versionId: string;
    };
    return getVersion(definitionId, versionId);
  });

  // ── GET /api/versions ─────────────────────────────────────────────────────
  // Cross-definition query — supports ?status=archived|active|deleted
  fastify.get('/api/versions', async (request) => {
    const query = request.query as { status?: string; page?: string; limit?: string };

    const db = getDb();
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const page = query.page ? parseInt(query.page, 10) : 1;
    const offset = (page - 1) * limit;

    const where = query.status ? 'WHERE v.status = ?' : '';
    const bindings: (string | number)[] = query.status ? [query.status] : [];

    const { count } = db
      .prepare(`SELECT COUNT(*) as count FROM iso_versions v ${where}`)
      .get(...bindings) as { count: number };

    const rows = db
      .prepare(
        `SELECT v.*, d.name as definition_name, d.family as definition_family
         FROM iso_versions v
         JOIN iso_definitions d ON d.id = v.definition_id
         ${where}
         ORDER BY v.created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(...bindings, limit, offset) as (IsoVersionRow & {
      definition_name: string;
      definition_family: string;
    })[];

    const data = rows.map((r) => ({
      ...rowToVersion(r),
      definitionName: r.definition_name,
      definitionFamily: r.definition_family,
    }));

    return { data, total: count, page, limit };
  });

  // ── PATCH /api/versions/:id/archive ──────────────────────────────────────
  fastify.patch('/api/versions/:id/archive', async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();

    const row = db.prepare('SELECT * FROM iso_versions WHERE id = ?').get(id) as
      | IsoVersionRow
      | undefined;
    if (!row) throw new NotFoundError('IsoVersion', id);

    if (row.status === 'archived') return rowToVersion(row);
    if (row.status !== 'active') {
      throw new ValidationError(`Cannot archive a version with status '${row.status}'`);
    }

    db.prepare(
      `UPDATE iso_versions SET status = 'archived', archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    ).run(id);

    logEvent('version.archived', 'version', id, { definitionId: row.definition_id });

    return rowToVersion(
      db.prepare('SELECT * FROM iso_versions WHERE id = ?').get(id) as IsoVersionRow,
    );
  });

  // ── PATCH /api/versions/:id/activate ─────────────────────────────────────
  fastify.patch('/api/versions/:id/activate', async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();

    const row = db.prepare('SELECT * FROM iso_versions WHERE id = ?').get(id) as
      | IsoVersionRow
      | undefined;
    if (!row) throw new NotFoundError('IsoVersion', id);

    if (row.status === 'active') return rowToVersion(row);
    if (row.status !== 'archived') {
      throw new ValidationError(`Cannot activate a version with status '${row.status}'`);
    }

    db.prepare(
      `UPDATE iso_versions SET status = 'active', archived_at = NULL, updated_at = datetime('now') WHERE id = ?`,
    ).run(id);

    logEvent('version.activated', 'version', id, { definitionId: row.definition_id });

    return rowToVersion(
      db.prepare('SELECT * FROM iso_versions WHERE id = ?').get(id) as IsoVersionRow,
    );
  });

  // ── GET /api/versions/:id/download ───────────────────────────────────────
  fastify.get('/api/versions/:id/download', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();

    const row = db.prepare('SELECT * FROM iso_versions WHERE id = ?').get(id) as
      | IsoVersionRow
      | undefined;
    if (!row) throw new NotFoundError('IsoVersion', id);

    let stat: fs.Stats;
    try {
      stat = fs.statSync(row.file_path);
    } catch {
      throw new NotFoundError('IsoFile', row.file_path);
    }

    const safeFilename = row.filename.replace(/["\r\n]/g, '');
    reply.raw.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Content-Length': String(stat.size),
    });

    const stream = fs.createReadStream(row.file_path);
    try {
      await pipeline(stream, reply.raw);
    } catch (err) {
      request.log.error({ err }, 'download.stream_error');
      if (!reply.raw.writableEnded) {
        reply.raw.destroy(err instanceof Error ? err : new Error(String(err)));
      }
    }
  });

  // ── GET /api/versions/:id/verify ─────────────────────────────────────────
  fastify.get('/api/versions/:id/verify', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();

    const row = db
      .prepare(
        `SELECT v.*, d.checksum_algo
         FROM iso_versions v
         JOIN iso_definitions d ON d.id = v.definition_id
         WHERE v.id = ?`,
      )
      .get(id) as (IsoVersionRow & { checksum_algo: string }) | undefined;

    if (!row) throw new NotFoundError('IsoVersion', id);

    if (!fs.existsSync(row.file_path)) {
      return reply.status(422).send({
        type: 'https://isovault.local/errors/file_not_found',
        title: 'FILE_NOT_FOUND',
        status: 422,
        detail: `ISO file not present on disk: ${row.file_path}`,
        requestId: request.id,
      });
    }

    const algo = row.checksum_algo as ChecksumAlgorithm;
    const computed = await computeFileChecksum(row.file_path, algo);
    const stored = row.checksum;
    const verified = stored !== null && computed === stored.toLowerCase();
    const checkedAt = new Date().toISOString();

    logEvent(
      verified ? 'checksum.verified' : 'checksum.mismatch',
      'version',
      id,
      { stored, computed },
      verified ? 'info' : 'error',
    );

    return { id, verified, stored, computed, checkedAt };
  });

  // ── DELETE /api/versions/:id ──────────────────────────────────────────────
  fastify.delete('/api/versions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();

    const row = db.prepare('SELECT * FROM iso_versions WHERE id = ?').get(id) as
      | IsoVersionRow
      | undefined;
    if (!row) throw new NotFoundError('IsoVersion', id);

    // Check definition exists (for context in audit log)
    const defRow = db
      .prepare('SELECT name FROM iso_definitions WHERE id = ?')
      .get(row.definition_id) as IsoDefinitionRow | undefined;

    try {
      deleteFile(row.file_path);
    } catch {
      // Ignore ENOENT — file may already be gone
    }

    db.prepare(
      `UPDATE iso_versions SET status = 'deleted', updated_at = datetime('now') WHERE id = ?`,
    ).run(id);

    logEvent('version.deleted', 'version', id, {
      definitionId: row.definition_id,
      definitionName: defRow?.name ?? null,
    });

    return reply.status(204).send();
  });
}
