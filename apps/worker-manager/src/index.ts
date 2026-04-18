import { createApp } from './app.js';
import { createLogger } from '@udd/observability';
import { config } from '@udd/config';

const logger = createLogger('worker-manager');
const PORT = config.port(3005);
const app = createApp();
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info('Worker manager started', { port: PORT });
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
