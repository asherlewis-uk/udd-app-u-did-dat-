import { createApp } from './app.js';
import { createLogger } from '@udd/observability';
import { config } from '@udd/config';

const logger = createLogger('api');
const PORT = config.port(8080);

const app = createApp();

const server = app.listen(PORT, '0.0.0.0', () => {
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
