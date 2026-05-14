// ─── Severity ─────────────────────────────────────────────────────────────────

export type ErrorSeverity = 'info' | 'warn' | 'error' | 'critical';

// ─── Base error ───────────────────────────────────────────────────────────────

export class IsoManagerError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly retryable: boolean;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(params: {
    message: string;
    code: string;
    statusCode?: number;
    severity?: ErrorSeverity;
    retryable?: boolean;
    context?: Record<string, unknown>;
    requestId?: string;
    cause?: Error;
  }) {
    super(params.message, { cause: params.cause });
    this.name = this.constructor.name;
    this.code = params.code;
    this.statusCode = params.statusCode ?? 500;
    this.severity = params.severity ?? 'error';
    this.retryable = params.retryable ?? false;
    this.context = this.sanitiseContext(params.context ?? {});
    this.timestamp = new Date();
    this.requestId = params.requestId;
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Strip sensitive keys before logging or serialising */
  private sanitiseContext(ctx: Record<string, unknown>): Record<string, unknown> {
    const redacted = { ...ctx };
    for (const key of ['api_key', 'secret', 'password', 'token', 'authorization']) {
      if (key in redacted) redacted[key] = '[REDACTED]';
    }
    return redacted;
  }

  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      retryable: this.retryable,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      ...(this.requestId ? { requestId: this.requestId } : {}),
    };
  }
}

// ─── Subclasses ───────────────────────────────────────────────────────────────

export class ValidationError extends IsoManagerError {
  constructor(message: string, field?: string, value?: unknown) {
    super({
      message,
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      severity: 'warn',
      retryable: false,
      context: { ...(field ? { field } : {}), ...(value !== undefined ? { value } : {}) },
    });
  }
}

export class AuthError extends IsoManagerError {
  constructor(message = 'Unauthorized') {
    super({ message, code: 'AUTH_ERROR', statusCode: 401, severity: 'warn', retryable: false });
  }
}

export class NotFoundError extends IsoManagerError {
  constructor(resource: string, id: string) {
    super({
      message: `${resource} not found: ${id}`,
      code: 'NOT_FOUND',
      statusCode: 404,
      severity: 'info',
      retryable: false,
      context: { resource, id },
    });
  }
}

export class ConflictError extends IsoManagerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      message,
      code: 'CONFLICT',
      statusCode: 409,
      severity: 'warn',
      retryable: false,
      context: context ?? {},
    });
  }
}

export class DownloadError extends IsoManagerError {
  constructor(message: string, url: string, attempt: number, cause?: Error) {
    super({
      message,
      code: 'DOWNLOAD_FAILED',
      statusCode: 500,
      severity: 'error',
      retryable: attempt < 3,
      context: { url, attempt },
      cause,
    });
  }
}

export class ChecksumMismatchError extends IsoManagerError {
  constructor(expected: string, actual: string, filePath: string) {
    super({
      message: `Checksum mismatch: expected ${expected.slice(0, 8)}… got ${actual.slice(0, 8)}…`,
      code: 'CHECKSUM_MISMATCH',
      statusCode: 500,
      severity: 'error',
      retryable: true, // retry the download once to rule out transit corruption
      context: { expected, actual, filePath },
    });
  }
}

export class StorageError extends IsoManagerError {
  constructor(message: string, storagePath: string, cause?: Error) {
    super({
      message,
      code: 'STORAGE_ERROR',
      statusCode: 500,
      severity: 'critical',
      retryable: false,
      context: { path: storagePath },
      cause,
    });
  }
}

export class WatcherError extends IsoManagerError {
  constructor(message: string, strategy: string, cause?: Error) {
    super({
      message,
      code: 'WATCHER_ERROR',
      statusCode: 500,
      severity: 'warn',
      retryable: true,
      context: { strategy },
      cause,
    });
  }
}

export class DatabaseError extends IsoManagerError {
  constructor(message: string, cause?: Error) {
    super({
      message,
      code: 'DATABASE_ERROR',
      statusCode: 500,
      severity: 'critical',
      retryable: false,
      cause,
    });
  }
}

export class SsrfBlockedError extends IsoManagerError {
  constructor(url: string) {
    super({
      message: 'Download URL rejected: private network addresses are not allowed',
      code: 'SSRF_BLOCKED',
      statusCode: 400,
      severity: 'warn',
      retryable: false,
      context: { url },
    });
  }
}
