import { getDb } from '../db/client';
import type { AppSetting } from '../types';
import type { SettingRow } from '../db/schema';

function rowToSetting(row: SettingRow): AppSetting {
  return { key: row.key, value: row.value, updatedAt: row.updated_at };
}

export function listSettings(): AppSetting[] {
  const rows = getDb().prepare('SELECT * FROM settings ORDER BY key').all() as SettingRow[];
  return rows.map(rowToSetting);
}

export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT * FROM settings WHERE key = ?').get(key) as
    | SettingRow
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): AppSetting {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, value);

  return rowToSetting(
    getDb().prepare('SELECT * FROM settings WHERE key = ?').get(key) as SettingRow,
  );
}
