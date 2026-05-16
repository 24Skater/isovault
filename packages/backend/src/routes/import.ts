import type { FastifyInstance } from 'fastify';
import { importByPath, importByUpload } from '../services/import';
import { ValidationError } from '../errors/base';

export async function importRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/definitions/:definitionId/versions/import
   *
   * Two modes, detected by Content-Type:
   *   multipart/form-data  — file upload from the client
   *   application/json     — server-side path import
   */
  fastify.post<{ Params: { definitionId: string } }>(
    '/api/definitions/:definitionId/versions/import',
    async (request, reply) => {
      const { definitionId } = request.params;

      if (request.isMultipart()) {
        // ── Upload mode ─────────────────────────────────────────────────────────
        const part = await request.file();
        if (!part) {
          throw new ValidationError('Multipart request must include a file field', 'file');
        }

        // Collect text fields that arrived alongside the file
        const fields = part.fields as Record<string, { value?: string } | undefined>;
        const get = (key: string) => fields[key]?.value?.trim() ?? '';

        const versionString = get('versionString');
        if (!versionString) {
          // Drain the stream before throwing to avoid connection hang
          part.file.resume();
          throw new ValidationError('versionString field is required', 'versionString');
        }

        const filename = get('filename') || part.filename;
        const checksum = get('checksum') || null;
        const releaseDate = get('releaseDate') || null;
        const notes = get('notes') || null;

        const version = await importByUpload({
          definitionId,
          filename,
          stream: part.file,
          versionString,
          checksum,
          releaseDate,
          notes,
        });

        return reply.status(201).send(version);
      } else {
        // ── Server-side path mode ───────────────────────────────────────────────
        const body = request.body as {
          sourcePath?: unknown;
          versionString?: unknown;
          filename?: unknown;
          checksum?: unknown;
          releaseDate?: unknown;
          notes?: unknown;
        };

        if (!body.sourcePath || typeof body.sourcePath !== 'string') {
          throw new ValidationError('sourcePath is required', 'sourcePath');
        }
        if (!body.versionString || typeof body.versionString !== 'string') {
          throw new ValidationError('versionString is required', 'versionString');
        }

        const version = await importByPath({
          definitionId,
          sourcePath: body.sourcePath,
          versionString: body.versionString,
          filename: typeof body.filename === 'string' ? body.filename : undefined,
          checksum: typeof body.checksum === 'string' ? body.checksum : null,
          releaseDate: typeof body.releaseDate === 'string' ? body.releaseDate : null,
          notes: typeof body.notes === 'string' ? body.notes : null,
        });

        return reply.status(201).send(version);
      }
    },
  );
}
