import { createLogger } from '@udd/observability';
import { PgUsageMeterRepository, closePool } from '@udd/database';

const logger = createLogger('usage-meter');

// ============================================================
// Usage meter — lightweight event consumer
//
// In Phase 2 the usage meter is wired for direct DB writes.
// Events arrive via the SQS queue (Phase 3 will replace this
// with a real SQS consumer). For now, it exposes an internal
// HTTP endpoint that other services call to record events.
// ============================================================

import express from 'express';
import { correlationIdMiddleware, mountHealthRoutes } from '@udd/observability';

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(correlationIdMiddleware);

const healthRouter = express.Router();
mountHealthRoutes(healthRouter);
app.use(healthRouter);

const meter = new PgUsageMeterRepository();

app.post('/internal/usage', async (req, res, next) => {
  try {
    const body = req.body as {
      workspaceId?: string;
      eventType?: string;
      resourceId?: string;
      quantity?: number;
      unit?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.workspaceId || !body.eventType || !body.resourceId || body.quantity == null || !body.unit) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Missing required fields' });
    }

    await meter.record({
      workspaceId: body.workspaceId,
      eventType: body.eventType,
      resourceId: body.resourceId,
      quantity: body.quantity,
      unit: body.unit,
      metadata: body.metadata ?? {},
    });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const server = app.listen(PORT, () => {
  logger.info('Usage meter started', { port: PORT });
});

const shutdown = async (): Promise<void> => {
  server.close(async () => {
    await closePool();
    logger.info('Usage meter stopped');
    process.exit(0);
  });
};

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
