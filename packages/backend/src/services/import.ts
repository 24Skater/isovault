import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import { getDefinition, createVersion } from './iso';
import { resolveVersionPath, ensureDefinitionDir, moveFile } from './storage';
import { computeFileChecksum } from '../utils/checksum';
import { logEvent } from './audit';
import { ValidationError } from '../errors/base';
import type { IsoVersion, ChecksumAlgorithm } from '../types';

// Lazy import to avoid circular deps with the download service
async function applyRetention(definitionId: string): Promise<void> {
  const { retentionService } = await import('./retention');
  await retentionService.applyRetention(definitionId);
}

// ─── Shared finalization ───────────────────────────────────────────────────────

interface FinalizeParams {
  definitionId: string;
  versionString: string;
  filename: string;
  checksumAlgo: ChecksumAlgorithm;
  expectedChecksum?: string | null;
  releaseDate?: string | null;
  notes?: string | null;
}

async function finalizeImport(sourceFile: string, params: FinalizeParams): Promise<IsoVersion> {
  const { definitionId, versionString, filename, checksumAlgo, expectedChecksum } = params;

  // Verify checksum against the source before committing
  if (expectedChecksum) {
    const computed = await computeFileChecksum(sourceFile, checksumAlgo);
    if (computed !== expectedChecksum.toLowerCase()) {
      throw new ValidationError(
        `Checksum mismatch: expected ${expectedChecksum.slice(0, 16)}… got ${computed.slice(0, 16)}…`,
        'checksum',
      );
    }
  }

  ensureDefinitionDir(definitionId);
  const destPath = resolveVersionPath(definitionId, filename);

  if (fs.existsSync(destPath)) {
    throw new ValidationError(
      `A file named "${filename}" already exists for this definition. Provide a different filename.`,
      'filename',
    );
  }

  moveFile(sourceFile, destPath);

  const stat = fs.statSync(destPath);
  const checksum = expectedChecksum
    ? expectedChecksum.toLowerCase()
    : await computeFileChecksum(destPath, checksumAlgo);

  const version = createVersion({
    definitionId,
    versionString,
    filename,
    filePath: destPath,
    sourceUrl: 'import://local',
    status: 'active',
    releaseDate: params.releaseDate ?? null,
    notes: params.notes ?? null,
    checksum,
    checksumVerified: Boolean(expectedChecksum),
    fileSizeBytes: stat.size,
    downloadCompletedAt: new Date().toISOString(),
  });

  logEvent('version.imported', 'version', version.id, {
    definitionId,
    versionString,
    filename,
    fileSizeBytes: stat.size,
    checksum,
    method: 'path',
  });

  try {
    await applyRetention(definitionId);
  } catch {
    // Non-fatal — retention failure does not roll back the import
  }

  return version;
}

// ─── Server-side path import ───────────────────────────────────────────────────

export interface ImportByPathDto {
  definitionId: string;
  sourcePath: string;
  versionString: string;
  filename?: string;
  checksum?: string | null;
  releaseDate?: string | null;
  notes?: string | null;
}

export async function importByPath(dto: ImportByPathDto): Promise<IsoVersion> {
  const definition = getDefinition(dto.definitionId);

  // Validate source: must exist and be a regular file (lstat guards against symlinks)
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(dto.sourcePath);
  } catch {
    throw new ValidationError(`Source file not accessible: ${dto.sourcePath}`, 'sourcePath');
  }
  if (!stat.isFile()) {
    throw new ValidationError(
      `Source path must be a regular file (not a directory or symlink): ${dto.sourcePath}`,
      'sourcePath',
    );
  }

  const filename = sanitizeFilename(dto.filename ?? path.basename(dto.sourcePath));

  // Copy source to a temp path first so we can validate before touching the store
  const tmpPath = path.join(config.storage.path, 'downloads', `import-${uuidv4()}.part`);
  fs.mkdirSync(path.dirname(tmpPath), { recursive: true });

  try {
    fs.copyFileSync(dto.sourcePath, tmpPath);

    return await finalizeImport(tmpPath, {
      definitionId: dto.definitionId,
      versionString: dto.versionString,
      filename,
      checksumAlgo: definition.checksumAlgo,
      expectedChecksum: dto.checksum ?? null,
      releaseDate: dto.releaseDate ?? null,
      notes: dto.notes ?? null,
    });
  } catch (err) {
    // Clean up temp file on any failure
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // ignore
    }
    throw err;
  }
}

// ─── HTTP upload import ────────────────────────────────────────────────────────

export interface ImportByUploadDto {
  definitionId: string;
  filename: string;
  stream: NodeJS.ReadableStream;
  versionString: string;
  checksum?: string | null;
  releaseDate?: string | null;
  notes?: string | null;
}

export async function importByUpload(dto: ImportByUploadDto): Promise<IsoVersion> {
  const definition = getDefinition(dto.definitionId);

  const filename = sanitizeFilename(dto.filename);
  if (!filename) {
    throw new ValidationError('filename must not be empty', 'filename');
  }

  const tmpPath = path.join(config.storage.path, 'downloads', `import-${uuidv4()}.part`);
  fs.mkdirSync(path.dirname(tmpPath), { recursive: true });

  try {
    await pipeline(dto.stream, fs.createWriteStream(tmpPath));

    return await finalizeImport(tmpPath, {
      definitionId: dto.definitionId,
      versionString: dto.versionString,
      filename,
      checksumAlgo: definition.checksumAlgo,
      expectedChecksum: dto.checksum ?? null,
      releaseDate: dto.releaseDate ?? null,
      notes: dto.notes ?? null,
    });
  } catch (err) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // ignore
    }
    throw err;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeFilename(raw: string): string {
  // Strip directory separators and null bytes; keep only the basename
  return path
    .basename(raw)
    .replace(/[\x00]/g, '')
    .trim();
}
