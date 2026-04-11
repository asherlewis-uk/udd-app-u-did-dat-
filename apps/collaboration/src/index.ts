import { createApp } from './app.js';
import { createLogger } from '@udd/observability';

const logger = createLogger('collaboration');
const PORT = parseInt(process.env['PORT'] ?? '3003', 10);
const app = createApp();
const server = app.listen(PORT, () => { logger.info('Collaboration service started', { port: PORT }); });
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
