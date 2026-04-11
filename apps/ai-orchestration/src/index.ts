import { createApp } from './app.js';
import { createLogger } from '@udd/observability';

const logger = createLogger('ai-orchestration');
const PORT = parseInt(process.env['PORT'] ?? '3004', 10);
const app = createApp();
const server = app.listen(PORT, () => { logger.info('AI orchestration service started', { port: PORT }); });
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
