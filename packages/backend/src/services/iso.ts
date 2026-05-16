import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client';
import type {
  IsoDefinition,
  IsoVersion,
  IsoStatus,
  ChecksumAlgorithm,
  RetentionBehavior,
  WatchStrategy,
} from '../types';
import type { IsoDefinitionRow, IsoVersionRow } from '../db/schema';
import { NotFoundError, ConflictError } from '../errors/base';
import config from '../config';
import { ensureDefinitionDir } from './storage';
import { logEvent } from './audit';

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function rowToDefinition(row: IsoDefinitionRow): IsoDefinition {
  return {
    id: row.id,
    name: row.name,
    family: row.family,
    architecture: row.architecture,
    description: row.description,
    tags: JSON.parse(row.tags) as string[],
    sourceUrl: row.source_url,
    checksumUrl: row.checksum_url,
    checksumAlgo: row.checksum_algo as ChecksumAlgorithm,
    retentionCount: row.retention_count,
    retentionBehavior: row.retention_behavior as RetentionBehavior,
    watchEnabled: row.watch_enabled === 1,
    watchStrategy: row.watch_strategy as WatchStrategy | null,
    watchConfig: row.watch_config
      ? (JSON.parse(row.watch_config) as Record<string, unknown>)
      : null,
    watchIntervalMinutes: row.watch_interval_minutes,
    watchLastCheckedAt: row.watch_last_checked_at,
    watchLastVersionFound: row.watch_last_version_found,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToVersion(row: IsoVersionRow): IsoVersion {
  return {
    id: row.id,
    definitionId: row.definition_id,
    versionString: row.version_string,
    releaseDate: row.release_date,
    filename: row.filename,
    filePath: row.file_path,
    fileSizeBytes: row.file_size_bytes,
    checksum: row.checksum,
    checksumVerified: row.checksum_verified === 1,
    status: row.status as IsoStatus,
    sourceUrl: row.source_url,
    downloadStartedAt: row.download_started_at,
    downloadCompletedAt: row.download_completed_at,
    archivedAt: row.archived_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateDefinitionDto {
  name: string;
  family: string;
  architecture: string;
  description?: string | null;
  tags?: string[];
  sourceUrl?: string | null;
  checksumUrl?: string | null;
  checksumAlgo?: ChecksumAlgorithm;
  retentionCount?: number;
  retentionBehavior?: RetentionBehavior;
  watchEnabled?: boolean;
  watchStrategy?: WatchStrategy | null;
  watchConfig?: Record<string, unknown> | null;
  watchIntervalMinutes?: number;
}

export type UpdateDefinitionDto = Partial<CreateDefinitionDto>;

export interface CreateVersionDto {
  definitionId: string;
  versionString: string;
  filename: string;
  filePath: string;
  sourceUrl: string;
  status?: IsoStatus;
  releaseDate?: string | null;
  checksum?: string | null;
  checksumVerified?: boolean;
  fileSizeBytes?: number | null;
  notes?: string | null;
  downloadCompletedAt?: string | null;
}

// ─── iso_definitions CRUD ─────────────────────────────────────────────────────

export interface ListDefinitionsParams {
  family?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function listDefinitions(params: ListDefinitionsParams): {
  definitions: IsoDefinition[];
  total: number;
} {
  const db = getDb();
  const conditions: string[] = [];
  const bindings: (string | number | null)[] = [];

  if (params.family) {
    conditions.push('family = ?');
    bindings.push(params.family);
  }
  if (params.search) {
    conditions.push('(name LIKE ? OR family LIKE ?)');
    bindings.push(`%${params.search}%`, `%${params.search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = params.limit ?? 50;
  const page = params.page ?? 1;
  const offset = (page - 1) * limit;

  const { count } = db
    .prepare(`SELECT COUNT(*) as count FROM iso_definitions ${where}`)
    .get(...bindings) as { count: number };

  const rows = db
    .prepare(
      `SELECT * FROM iso_definitions ${where} ORDER BY family ASC, name ASC LIMIT ? OFFSET ?`,
    )
    .all(...bindings, limit, offset) as IsoDefinitionRow[];

  return { definitions: rows.map(rowToDefinition), total: count };
}

export function getDefinition(id: string): IsoDefinition {
  const db = getDb();
  const row = db.prepare('SELECT * FROM iso_definitions WHERE id = ?').get(id) as
    | IsoDefinitionRow
    | undefined;
  if (!row) throw new NotFoundError('IsoDefinition', id);
  return rowToDefinition(row);
}

export function createDefinition(dto: CreateDefinitionDto): IsoDefinition {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id FROM iso_definitions WHERE name = ?').get(dto.name);
  if (existing) {
    throw new ConflictError(`A definition named "${dto.name}" already exists`, {
      name: dto.name,
    });
  }

  db.prepare(
    `INSERT INTO iso_definitions (
       id, name, family, architecture, description, tags,
       source_url, checksum_url, checksum_algo,
       retention_count, retention_behavior,
       watch_enabled, watch_strategy, watch_config, watch_interval_minutes,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    dto.name,
    dto.family,
    dto.architecture,
    dto.description ?? null,
    JSON.stringify(dto.tags ?? []),
    dto.sourceUrl ?? null,
    dto.checksumUrl ?? null,
    dto.checksumAlgo ?? 'sha256',
    dto.retentionCount ?? config.retention.defaultCount,
    dto.retentionBehavior ?? config.retention.defaultBehavior,
    dto.watchEnabled ? 1 : 0,
    dto.watchStrategy ?? null,
    dto.watchConfig ? JSON.stringify(dto.watchConfig) : null,
    dto.watchIntervalMinutes ?? 60,
    now,
    now,
  );

  ensureDefinitionDir(id);

  logEvent('definition.created', 'definition', id, { name: dto.name, family: dto.family });

  return getDefinition(id);
}

export function updateDefinition(id: string, dto: UpdateDefinitionDto): IsoDefinition {
  const db = getDb();
  const current = getDefinition(id);

  if (dto.name && dto.name !== current.name) {
    const conflict = db
      .prepare('SELECT id FROM iso_definitions WHERE name = ? AND id != ?')
      .get(dto.name, id);
    if (conflict) {
      throw new ConflictError(`A definition named "${dto.name}" already exists`, {
        name: dto.name,
      });
    }
  }

  // Guarantee updatedAt is strictly after createdAt even on fast hardware
  const now = new Date(
    Math.max(Date.now(), new Date(current.updatedAt).getTime() + 1),
  ).toISOString();

  const watchConfig =
    dto.watchConfig !== undefined
      ? dto.watchConfig
        ? JSON.stringify(dto.watchConfig)
        : null
      : current.watchConfig
        ? JSON.stringify(current.watchConfig)
        : null;

  db.prepare(
    `UPDATE iso_definitions SET
       name = ?, family = ?, architecture = ?, description = ?, tags = ?,
       source_url = ?, checksum_url = ?, checksum_algo = ?,
       retention_count = ?, retention_behavior = ?,
       watch_enabled = ?, watch_strategy = ?, watch_config = ?, watch_interval_minutes = ?,
       updated_at = ?
     WHERE id = ?`,
  ).run(
    dto.name ?? current.name,
    dto.family ?? current.family,
    dto.architecture ?? current.architecture,
    dto.description !== undefined ? dto.description : current.description,
    JSON.stringify(dto.tags ?? current.tags),
    dto.sourceUrl !== undefined ? dto.sourceUrl : current.sourceUrl,
    dto.checksumUrl !== undefined ? dto.checksumUrl : current.checksumUrl,
    dto.checksumAlgo ?? current.checksumAlgo,
    dto.retentionCount ?? current.retentionCount,
    dto.retentionBehavior ?? current.retentionBehavior,
    dto.watchEnabled !== undefined ? (dto.watchEnabled ? 1 : 0) : current.watchEnabled ? 1 : 0,
    dto.watchStrategy !== undefined ? dto.watchStrategy : current.watchStrategy,
    watchConfig,
    dto.watchIntervalMinutes ?? current.watchIntervalMinutes,
    now,
    id,
  );

  logEvent('definition.updated', 'definition', id, { name: dto.name ?? current.name });

  return getDefinition(id);
}

export function deleteDefinition(id: string): void {
  const db = getDb();
  const current = getDefinition(id);
  db.prepare('DELETE FROM iso_definitions WHERE id = ?').run(id);
  logEvent('definition.deleted', 'definition', id, { name: current.name });
}

// ─── iso_versions queries ─────────────────────────────────────────────────────

export function listVersions(
  definitionId: string,
  params: { page?: number; limit?: number },
): { versions: IsoVersion[]; total: number } {
  getDefinition(definitionId); // 404 if definition doesn't exist

  const db = getDb();
  const limit = params.limit ?? 50;
  const page = params.page ?? 1;
  const offset = (page - 1) * limit;

  const { count } = db
    .prepare('SELECT COUNT(*) as count FROM iso_versions WHERE definition_id = ?')
    .get(definitionId) as { count: number };

  const rows = db
    .prepare(
      `SELECT * FROM iso_versions WHERE definition_id = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(definitionId, limit, offset) as IsoVersionRow[];

  return { versions: rows.map(rowToVersion), total: count };
}

export function getVersion(definitionId: string, versionId: string): IsoVersion {
  getDefinition(definitionId); // 404 if definition doesn't exist

  const db = getDb();
  const row = db
    .prepare('SELECT * FROM iso_versions WHERE id = ? AND definition_id = ?')
    .get(versionId, definitionId) as IsoVersionRow | undefined;
  if (!row) throw new NotFoundError('IsoVersion', versionId);
  return rowToVersion(row);
}

export function createVersion(dto: CreateVersionDto): IsoVersion {
  getDefinition(dto.definitionId); // 404 if definition doesn't exist

  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO iso_versions
       (id, definition_id, version_string, release_date, filename, file_path,
        file_size_bytes, checksum, checksum_verified, status, source_url,
        download_started_at, download_completed_at, archived_at, notes,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?, ?)`,
  ).run(
    id,
    dto.definitionId,
    dto.versionString,
    dto.releaseDate ?? null,
    dto.filename,
    dto.filePath,
    dto.fileSizeBytes ?? null,
    dto.checksum ?? null,
    dto.checksumVerified ? 1 : 0,
    dto.status ?? 'pending',
    dto.sourceUrl,
    dto.downloadCompletedAt ?? null,
    dto.notes ?? null,
    now,
    now,
  );

  return rowToVersion(
    db.prepare('SELECT * FROM iso_versions WHERE id = ?').get(id) as IsoVersionRow,
  );
}
