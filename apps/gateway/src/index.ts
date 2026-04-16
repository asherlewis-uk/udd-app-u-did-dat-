import { createApp } from './app.js';
import { createLogger } from '@udd/observability';
import { closePool } from '@udd/database';
import { PgPreviewRouteRegistry } from './registry.js';
import { config } from '@udd/config';

const logger = createLogger('gateway');
const PORT = config.port(3000);

const registry = new PgPreviewRouteRegistry();
const app = createApp(registry);

const server = app.listen(PORT, () => {
  logger.info('Preview gateway started', { port: PORT });
});

const shutdown = async (): Promise<void> => {
  logger.info('Shutting down gateway...');
  server.close(async () => {
    await closePool();
    logger.info('Gateway stopped');
    process.exit(0);
  });
};

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
