// ============================================================
// Structured JSON logger with correlation ID propagation
// All logs are newline-delimited JSON for log aggregator ingestion.
// Secrets must NEVER be passed to the logger — callers are responsible.
// ============================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  workspaceId?: string;
  service?: string;
  [key: string]: unknown;
}

export interface LogEntry extends LogContext {
  level: LogLevel;
  message: string;
  timestamp: string;
  err?: { message: string; code?: string; stack?: string };
}

const LEVEL_RANKS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const level = process.env['LOG_LEVEL'] ?? 'info';
  if (level in LEVEL_RANKS) return level as LogLevel;
  return 'info';
}

function formatError(err: unknown): LogEntry['err'] {
  if (err instanceof Error) {
    return {
      message: err.message,
      code: (err as NodeJS.ErrnoException).code,
      stack: process.env['NODE_ENV'] !== 'production' ? err.stack : undefined,
    };
  }
  return { message: String(err) };
}

export class Logger {
  private readonly ctx: LogContext;
  private readonly minLevel: LogLevel;

  constructor(ctx: LogContext = {}, minLevel?: LogLevel) {
    this.ctx = ctx;
    this.minLevel = minLevel ?? getMinLevel();
  }

  child(extraCtx: LogContext): Logger {
    return new Logger({ ...this.ctx, ...extraCtx }, this.minLevel);
  }

  private write(level: LogLevel, message: string, extra?: LogContext & { err?: unknown }): void {
    if (LEVEL_RANKS[level] < LEVEL_RANKS[this.minLevel]) return;

    const { err, ...rest } = extra ?? {};
    const entry: LogEntry = {
      ...this.ctx,
      ...rest,
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(err !== undefined ? { err: formatError(err) } : {}),
    };

    // Output to stdout for log aggregator collection
    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  debug(message: string, ctx?: LogContext): void {
    this.write('debug', message, ctx);
  }

  info(message: string, ctx?: LogContext): void {
    this.write('info', message, ctx);
  }

  warn(message: string, ctx?: LogContext & { err?: unknown }): void {
    this.write('warn', message, ctx);
  }

  error(message: string, ctx?: LogContext & { err?: unknown }): void {
    this.write('error', message, ctx);
  }
}

// Default root logger — services should create a child with their service name
export const rootLogger = new Logger({ service: process.env['OTEL_SERVICE_NAME'] ?? 'udd' });

export function createLogger(service: string, ctx?: LogContext): Logger {
  return rootLogger.child({ service, ...ctx });
}
