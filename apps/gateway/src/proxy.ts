import type { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createLogger } from '@udd/observability';
import { config } from '@udd/config';
import type { AuthContext } from '@udd/auth';
import type { PreviewRouteBinding } from '@udd/contracts';

const logger = createLogger('gateway');

// Hop-by-hop headers that must not be forwarded to the upstream
const HOP_BY_HOP = new Set([
  'connection',
  'transfer-encoding',
  'keep-alive',
  'upgrade',
  'proxy-authorization',
  'proxy-authenticate',
  'te',
  'trailers',
]);

// ============================================================
// Preview Proxy — Tier 1 Differentiator
//
// Security model (ALL checks must pass):
//   1. Request must carry a valid session token (authenticated)
//   2. User must be a member of the workspace that owns the preview
//   3. The preview route must exist in the authoritative DB registry
//   4. The route state must be 'active' (not revoked, expired, or binding)
//   5. The lease for the backing session must still be active
//
// Route ID alone is NEVER sufficient for access.
// The proxy target comes exclusively from the verified DB record.
// Arbitrary upstream override via headers is forbidden.
// ============================================================

export interface PreviewRouteRegistry {
  /** Fetch the preview route binding from the authoritative DB */
  findActiveRoute(previewId: string): Promise<PreviewRouteBinding | null>;
  /** Check that the requesting user is a member of the workspace */
  isMember(userId: string, workspaceId: string): Promise<boolean>;
}

export interface ProxyResult {
  allowed: boolean;
  denyCode?: string;
  denyMessage?: string;
  target?: { host: string; port: number };
}

/**
 * Authorize a preview proxy request.
 * Returns the upstream target if all checks pass.
 */
export async function authorizePreviewRequest(
  previewId: string,
  auth: AuthContext,
  registry: PreviewRouteRegistry,
  correlationId: string,
): Promise<ProxyResult> {
  const binding = await registry.findActiveRoute(previewId);

  if (!binding) {
    logger.info('Preview route not found', { previewId, correlationId });
    return { allowed: false, denyCode: 'PREVIEW_NOT_FOUND', denyMessage: 'Preview not found' };
  }

  if (binding.state !== 'active') {
    const code = binding.state === 'revoked' ? 'PREVIEW_REVOKED' : 'PREVIEW_EXPIRED';
    logger.info('Preview route not active', { previewId, state: binding.state, correlationId });
    return { allowed: false, denyCode: code, denyMessage: `Preview is ${binding.state}` };
  }

  if (binding.expiresAt && new Date(binding.expiresAt) < new Date()) {
    logger.info('Preview route expired', {
      previewId,
      expiresAt: binding.expiresAt,
      correlationId,
    });
    return { allowed: false, denyCode: 'PREVIEW_EXPIRED', denyMessage: 'Preview has expired' };
  }

  const isMember = await registry.isMember(auth.userId, binding.workspaceId);
  if (!isMember) {
    logger.warn('Preview access denied — not a workspace member', {
      previewId,
      workspaceId: binding.workspaceId,
      userId: auth.userId,
      correlationId,
    });
    return { allowed: false, denyCode: 'FORBIDDEN', denyMessage: 'Access denied' };
  }

  logger.info('Preview access authorized', {
    previewId,
    workerHost: binding.workerHost,
    hostPort: binding.hostPort,
    correlationId,
  });

  return {
    allowed: true,
    target: { host: binding.workerHost, port: binding.hostPort },
  };
}

/**
 * Express middleware factory for preview proxy.
 * Requires authMiddleware to have run first.
 *
 * Path pattern: /preview/:previewId[/:path...]
 * The upstream target is resolved from the authoritative DB record only.
 * Worker nodes are in a private subnet — only this gateway can reach them.
 */
export function previewProxyMiddleware(registry: PreviewRouteRegistry) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const previewId = req.params['previewId'];
    const auth = req.auth;

    if (!previewId) {
      res.status(400).json({ code: 'BAD_REQUEST', message: 'Missing previewId' });
      return;
    }

    if (!auth) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required to access previews',
        correlationId: req.correlationId ?? 'unknown',
      });
      return;
    }

    const result = await authorizePreviewRequest(
      previewId,
      auth,
      registry,
      req.correlationId ?? 'unknown',
    ).catch((err) => {
      logger.error('Authorization check failed', { previewId, err });
      return null;
    });

    if (!result) {
      res
        .status(500)
        .json({ code: 'INTERNAL_ERROR', correlationId: req.correlationId ?? 'unknown' });
      return;
    }

    if (!result.allowed || !result.target) {
      const statusCode =
        result.denyCode === 'PREVIEW_NOT_FOUND' ? 404 : result.denyCode === 'FORBIDDEN' ? 403 : 410; // revoked or expired

      res.status(statusCode).json({
        code: result.denyCode,
        message: result.denyMessage,
        correlationId: req.correlationId ?? 'unknown',
      });
      return;
    }

    // Strip hop-by-hop headers before forwarding.
    // SECURITY: use `delete` — setting to undefined leaves the key present
    // and http-proxy-middleware may serialize it as the string "undefined".
    for (const header of HOP_BY_HOP) {
      delete req.headers[header];
    }
    // Inject correlation ID into upstream request
    req.headers['x-correlation-id'] = req.correlationId ?? 'unknown';
    // Strip the /preview/:previewId prefix — upstream sees the path relative to its root
    const upstreamPath = req.url.replace(`/preview/${previewId}`, '') || '/';

    const { host, port } = result.target;

    // SECURITY: Validate the worker target is within the expected private subnet.
    // Even though the target comes from DB, defense-in-depth requires we verify
    // it is not pointing to cloud metadata, loopback, or unexpected networks.
    const allowedWorkerSubnet = config.gateway.workerSubnetPrefix();
    if (
      !host.startsWith(allowedWorkerSubnet) ||
      host === 'localhost' ||
      host.startsWith('127.') ||
      host.startsWith('169.254.')
    ) {
      logger.error('Worker target outside allowed subnet', {
        previewId,
        host,
        port,
        allowedWorkerSubnet,
        correlationId: req.correlationId ?? 'unknown',
      });
      res.status(502).json({
        code: 'BAD_GATEWAY',
        message: 'Invalid preview backend configuration',
        correlationId: req.correlationId ?? 'unknown',
      });
      return;
    }

    const target = `http://${host}:${port}`;

    // Use http-proxy-middleware for the actual proxying
    const proxyHandler = createProxyMiddleware({
      target,
      changeOrigin: false, // worker is on private network — no hostname rewrite needed
      pathRewrite: { [`^/preview/${previewId}`]: '' },
      on: {
        error: (err, _req, proxyRes) => {
          logger.error('Proxy error', { previewId, target, err });
          if (!res.headersSent) {
            if (typeof (proxyRes as Response).status === 'function') {
              (proxyRes as Response).status(502).json({
                code: 'BAD_GATEWAY',
                message: 'Preview backend unavailable',
                correlationId: req.correlationId ?? 'unknown',
              });
            }
          }
        },
      },
    });

    void upstreamPath; // used implicitly via pathRewrite above
    proxyHandler(req, res, next);
  };
}
