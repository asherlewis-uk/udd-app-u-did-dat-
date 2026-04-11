import { createLogger } from '@udd/observability';
import { registerHost, startHeartbeatLoop } from './agent.js';
import { config } from '@udd/config';

const logger = createLogger('host-agent');

async function main(): Promise<void> {
  logger.info('Host agent starting');
  await registerHost();
  const timer = startHeartbeatLoop(config.worker.heartbeatIntervalMs());
  logger.info('Host agent started');

  const shutdown = (): void => {
    clearInterval(timer);
    logger.info('Host agent stopped');
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('[host-agent] fatal:', err);
  process.exit(1);
});
