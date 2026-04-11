import { createApp } from './app.js';
import { createLogger } from '@udd/observability';

const logger = createLogger('worker-manager');
const PORT = parseInt(process.env['PORT'] ?? '3005', 10);
const app = createApp();
const server = app.listen(PORT, () => { logger.info('Worker manager started', { port: PORT }); });
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
