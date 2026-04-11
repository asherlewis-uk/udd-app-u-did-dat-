import { createApp } from './app.js';
import { createLogger } from '@udd/observability';

const logger = createLogger('api');
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

const app = createApp();

const server = app.listen(PORT, () => {
  logger.info('API gateway started', { port: PORT });
});

const shutdown = (): void => {
  logger.info('Shutting down API gateway...');
  server.close(() => {
    logger.info('API gateway stopped');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
