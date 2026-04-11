import { createApp } from './app.js';
import { createLogger } from '@udd/observability';

const logger = createLogger('orchestrator');
const PORT = parseInt(process.env['PORT'] ?? '3002', 10);
const app = createApp();
const server = app.listen(PORT, () => { logger.info('Orchestrator started', { port: PORT }); });
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
