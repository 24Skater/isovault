import type { FastifyInstance } from 'fastify';
import { listSettings, setSetting } from '../services/settings';
import { NotFoundError, ValidationError } from '../errors/base';

const ALLOWED_KEYS = new Set([
  'max_concurrent_downloads',
  'default_retention_count',
  'default_retention_behavior',
  'storage_alert_threshold_percent',
  'log_retention_days',
]);

// Per-key validation: returns an error message string or null if valid.
type Validator = (v: string) => string | null;

function integerInRange(min: number, max: number): Validator {
  return (v) => {
    const n = Number(v);
    if (!Number.isInteger(n)) return `must be an integer`;
    if (n < min || n > max) return `must be between ${min} and ${max}`;
    return null;
  };
}

const SETTING_VALIDATORS: Record<string, Validator> = {
  max_concurrent_downloads: integerInRange(1, 16),
  default_retention_count: integerInRange(1, 100),
  default_retention_behavior: (v) =>
    ['archive', 'delete'].includes(v) ? null : `must be "archive" or "delete"`,
  storage_alert_threshold_percent: integerInRange(1, 99),
  log_retention_days: integerInRange(0, 365),
};

export async function settingsRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/settings ─────────────────────────────────────────────────────
  fastify.get('/api/settings', async () => {
    return { data: listSettings() };
  });

  // ── PUT /api/settings/:key ────────────────────────────────────────────────
  fastify.put('/api/settings/:key', {
    schema: {
      body: {
        type: 'object',
        required: ['value'],
        properties: {
          value: { type: 'string', minLength: 1, maxLength: 256 },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const { key } = request.params as { key: string };
      const { value } = request.body as { value: string };

      if (!ALLOWED_KEYS.has(key)) {
        throw new NotFoundError('Setting', key);
      }

      const validator = SETTING_VALIDATORS[key];
      if (validator) {
        const error = validator(value);
        if (error) throw new ValidationError(`Setting "${key}": ${error}`, key, value);
      }

      return setSetting(key, value);
    },
  });
}
