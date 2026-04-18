import { createApp } from './app.js';
import { createLogger } from '@udd/observability';
import { config } from '@udd/config';

const logger = createLogger('ai-orchestration');
const PORT = config.port(8080);
const app = createApp();
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info('AI orchestration service started', { port: PORT });
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
