import fs from 'fs';
import path from 'path';
import config from '../config';
import { StorageError } from '../errors/base';

// ─── Directory helpers ────────────────────────────────────────────────────────

export function ensureDefinitionDir(definitionId: string): string {
  const dir = path.join(config.storage.path, definitionId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function resolveVersionPath(definitionId: string, filename: string): string {
  return path.join(config.storage.path, definitionId, filename);
}

// ─── File operations ──────────────────────────────────────────────────────────

export function moveFile(src: string, dest: string): void {
  const destDir = path.dirname(dest);
  fs.mkdirSync(destDir, { recursive: true });
  try {
    fs.renameSync(src, dest);
  } catch (err) {
    // Cross-device rename: fall back to copy + delete
    try {
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
    } catch (copyErr) {
      throw new StorageError(
        `Failed to move file from ${src} to ${dest}`,
        dest,
        copyErr instanceof Error ? copyErr : undefined,
      );
    }
  }
}

export function deleteFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new StorageError(
        `Failed to delete file: ${filePath}`,
        filePath,
        err instanceof Error ? err : undefined,
      );
    }
    // ENOENT is fine — file already gone
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface StorageStats {
  storagePath: string;
  usedBytes: number;
  freeBytes: number | null;
  totalBytes: number | null;
  alertThresholdPercent: number;
}

function dirSizeBytes(dirPath: string): number {
  let total = 0;
  if (!fs.existsSync(dirPath)) return 0;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += dirSizeBytes(full);
    } else if (entry.isFile()) {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

export function getStorageStats(): StorageStats {
  let freeBytes: number | null = null;
  let totalBytes: number | null = null;

  try {
    const stat = fs.statfsSync(config.storage.path);
    freeBytes = stat.bfree * stat.bsize;
    totalBytes = stat.blocks * stat.bsize;
  } catch {
    // statfsSync unavailable on some platforms (e.g. older Node or Windows paths)
  }

  return {
    storagePath: config.storage.path,
    usedBytes: dirSizeBytes(config.storage.path),
    freeBytes,
    totalBytes,
    alertThresholdPercent: config.storage.alertThresholdPercent,
  };
}
