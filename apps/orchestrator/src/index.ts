import { createApp } from './app.js';
import { createLogger } from '@udd/observability';
import { config } from '@udd/config';

const logger = createLogger('orchestrator');
const PORT = config.port(3002);
const app = createApp();
const server = app.listen(PORT, () => {
  logger.info('Orchestrator started', { port: PORT });
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
