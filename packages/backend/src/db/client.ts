import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type { MigrationRow } from './schema';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    throw new Error('Database not initialised. Call initDb() first.');
  }
  return _db;
}

export function initDb(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);

  // WAL mode for concurrent reads + single-writer pattern
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  // NORMAL is safe with WAL and gives the best throughput for homelab workloads
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('cache_size = -32768'); // 32MB page cache

  runMigrations(db);

  _db = db;
  return db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      applied_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const appliedRows = db
    .prepare('SELECT name FROM _migrations ORDER BY id ASC')
    .all() as MigrationRow[];
  const applied = new Set(appliedRows.map((r) => r.name));

  const insertMigration = db.prepare('INSERT INTO _migrations (name) VALUES (?)');

  const runBatch = db.transaction((pending: string[]) => {
    for (const file of pending) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      db.exec(sql);
      insertMigration.run(file);
      console.log(`[db] Applied migration: ${file}`);
    }
  });

  const pending = files.filter((f) => !applied.has(f));
  if (pending.length > 0) {
    runBatch(pending);
  }
}
