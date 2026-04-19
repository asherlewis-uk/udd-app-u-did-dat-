import { Router } from 'express';
import { config } from '@udd/config';

const router = Router();

/**
 * GET /v1/healthz/connectivity
 * Probes all internal peer services defined in config.services.
 * Used for inter-service communication auditing in the VPC.
 */
router.get('/healthz/connectivity', async (req, res) => {
  const services = {
    orchestrator: config.services.orchestratorBaseUrl(),
    collaboration: config.services.collaborationBaseUrl(),
    aiOrchestration: config.services.aiOrchestrationBaseUrl(),
    workerManager: config.services.workerManagerBaseUrl(),
    usageMeter: config.services.usageMeterBaseUrl(),
    gateway: config.services.gatewayBaseUrl(),
  };

  const probes = await Promise.all(
    Object.entries(services).map(async ([name, url]) => {
      try {
        const start = Date.now();
        // Use a 5s timeout for the probe
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${url}/healthz`, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeout);

        return {
          service: name,
          url,
          status: response.ok ? 'pass' : 'fail',
          statusCode: response.status,
          latencyMs: Date.now() - start,
        };
      } catch (err: any) {
        return {
          service: name,
          url,
          status: 'fail',
          error: err.name === 'AbortError' ? 'timeout' : err.message,
        };
      }
    })
  );

  const allPassed = probes.every((p) => p.status === 'pass');

  res.status(allPassed ? 200 : 207).json({
    probes,
    allPassed,
    correlationId: req.correlationId,
  });
});

export default router;
