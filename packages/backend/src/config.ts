import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// ─── Config shape ─────────────────────────────────────────────────────────────

export interface Config {
  server: {
    port: number;
    host: string;
    corsOrigins: string[];
  };
  storage: {
    path: string;
    alertThresholdPercent: number;
  };
  database: {
    path: string;
  };
  downloads: {
    maxConcurrent: number;
    retryMaxAttempts: number;
    retryBaseDelaySeconds: number;
    timeoutSeconds: number;
  };
  retention: {
    defaultCount: number;
    defaultBehavior: 'archive' | 'delete';
  };
  scheduler: {
    watcherCheckIntervalCron: string;
    dbBackupCron: string;
    cleanupCron: string;
  };
  security: {
    ssrfProtection: boolean;
    maxRedirects: number;
  };
  logging: {
    level: string;
    retentionDays: number;
  };
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaults: Config = {
  server: {
    port: 3721,
    host: '0.0.0.0',
    corsOrigins: ['http://localhost:5173'],
  },
  storage: {
    path: process.platform === 'win32' ? 'C:\\iso-store' : '/var/lib/iso-manager',
    alertThresholdPercent: 80,
  },
  database: {
    path:
      process.platform === 'win32'
        ? 'C:\\iso-store\\db\\iso-manager.sqlite3'
        : '/data/db/iso-manager.sqlite3',
  },
  downloads: {
    maxConcurrent: 3,
    retryMaxAttempts: 3,
    retryBaseDelaySeconds: 30,
    timeoutSeconds: 3600,
  },
  retention: {
    defaultCount: 5,
    defaultBehavior: 'archive',
  },
  scheduler: {
    watcherCheckIntervalCron: '0 * * * *',
    dbBackupCron: '0 2 * * *',
    cleanupCron: '0 3 * * *',
  },
  security: {
    ssrfProtection: true,
    maxRedirects: 5,
  },
  logging: {
    level: 'info',
    retentionDays: 30,
  },
};

// ─── Loader ────────────────────────────────────────────────────────────────────

function loadYamlConfig(filePath: string): Partial<Config> {
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = yaml.load(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
    return normaliseYaml(raw ?? {});
  } catch (err) {
    throw new Error(`Failed to parse config file at ${filePath}: ${(err as Error).message}`);
  }
}

// Convert snake_case YAML keys to camelCase nested config
function normaliseYaml(raw: Record<string, unknown>): Partial<Config> {
  const partial: Partial<Config> = {};

  const server = raw['server'] as Record<string, unknown> | undefined;
  if (server) {
    partial.server = {
      port: (server['port'] as number) ?? defaults.server.port,
      host: (server['host'] as string) ?? defaults.server.host,
      corsOrigins: (server['cors_origins'] as string[]) ?? defaults.server.corsOrigins,
    };
  }

  const storage = raw['storage'] as Record<string, unknown> | undefined;
  if (storage) {
    partial.storage = {
      path: (storage['path'] as string) ?? defaults.storage.path,
      alertThresholdPercent:
        (storage['alert_threshold_percent'] as number) ?? defaults.storage.alertThresholdPercent,
    };
  }

  const downloads = raw['downloads'] as Record<string, unknown> | undefined;
  if (downloads) {
    partial.downloads = {
      maxConcurrent: (downloads['max_concurrent'] as number) ?? defaults.downloads.maxConcurrent,
      retryMaxAttempts:
        (downloads['retry_max_attempts'] as number) ?? defaults.downloads.retryMaxAttempts,
      retryBaseDelaySeconds:
        (downloads['retry_base_delay_seconds'] as number) ??
        defaults.downloads.retryBaseDelaySeconds,
      timeoutSeconds: (downloads['timeout_seconds'] as number) ?? defaults.downloads.timeoutSeconds,
    };
  }

  const retention = raw['retention'] as Record<string, unknown> | undefined;
  if (retention) {
    partial.retention = {
      defaultCount: (retention['default_count'] as number) ?? defaults.retention.defaultCount,
      defaultBehavior:
        (retention['default_behavior'] as string as 'archive' | 'delete') ??
        defaults.retention.defaultBehavior,
    };
  }

  const scheduler = raw['scheduler'] as Record<string, unknown> | undefined;
  if (scheduler) {
    partial.scheduler = {
      watcherCheckIntervalCron:
        (scheduler['watcher_check_interval_cron'] as string) ??
        defaults.scheduler.watcherCheckIntervalCron,
      dbBackupCron: (scheduler['db_backup_cron'] as string) ?? defaults.scheduler.dbBackupCron,
      cleanupCron: (scheduler['cleanup_cron'] as string) ?? defaults.scheduler.cleanupCron,
    };
  }

  const security = raw['security'] as Record<string, unknown> | undefined;
  if (security) {
    partial.security = {
      ssrfProtection: (security['ssrf_protection'] as boolean) ?? defaults.security.ssrfProtection,
      maxRedirects: (security['max_redirects'] as number) ?? defaults.security.maxRedirects,
    };
  }

  const logging = raw['logging'] as Record<string, unknown> | undefined;
  if (logging) {
    partial.logging = {
      level: (logging['level'] as string) ?? defaults.logging.level,
      retentionDays: (logging['retention_days'] as number) ?? defaults.logging.retentionDays,
    };
  }

  return partial;
}

function applyEnvOverrides(cfg: Config): Config {
  const port = parseInt(process.env['PORT'] ?? '', 10);
  if (!isNaN(port)) cfg.server.port = port;

  if (process.env['ISO_MANAGER_LOG_LEVEL']) {
    cfg.logging.level = process.env['ISO_MANAGER_LOG_LEVEL'];
  }
  if (process.env['ISO_MANAGER_DB_PATH']) {
    cfg.database.path = process.env['ISO_MANAGER_DB_PATH'];
  }
  if (process.env['ISO_STORE_PATH']) {
    cfg.storage.path = process.env['ISO_STORE_PATH'];
    if (!process.env['ISO_MANAGER_DB_PATH']) {
      cfg.database.path = `${cfg.storage.path}/db/iso-manager.sqlite3`;
    }
  }

  return cfg;
}

function buildConfig(): Config {
  const configFilePath =
    process.env['ISO_MANAGER_CONFIG'] ?? path.join(process.cwd(), 'config.yaml');

  const fromYaml = loadYamlConfig(configFilePath);

  const merged: Config = {
    server: { ...defaults.server, ...fromYaml.server },
    storage: { ...defaults.storage, ...fromYaml.storage },
    database: { ...defaults.database, ...fromYaml.database },
    downloads: { ...defaults.downloads, ...fromYaml.downloads },
    retention: { ...defaults.retention, ...fromYaml.retention },
    scheduler: { ...defaults.scheduler, ...fromYaml.scheduler },
    security: { ...defaults.security, ...fromYaml.security },
    logging: { ...defaults.logging, ...fromYaml.logging },
  };

  return applyEnvOverrides(merged);
}

const config: Config = buildConfig();
export default config;
