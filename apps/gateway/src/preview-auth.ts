import type { Request, Response, NextFunction } from 'express';
import { authMiddleware, verifyPreviewToken, previewTokenToAuthContext } from '@udd/auth';
import { createLogger } from '@udd/observability';

const logger = createLogger('gateway');

// ============================================================
// Preview Auth Middleware
//
// Accepts two credential transports for preview routes:
//   1. Authorization: Bearer <session-jwt>  (existing flow)
//   2. ?preview_token=<preview-jwt>         (iframe/WKWebView safe)
//
// If a Bearer header is present, the standard authMiddleware runs.
// Otherwise, the preview_token query param is checked.
//
// In both cases, req.auth is set and the downstream proxy
// performs full authorization (route lookup, membership, TTL, target).
// ============================================================

/**
 * Try Bearer auth first. If no Bearer header but a preview_token
 * query param exists, verify it and attach auth context.
 */
export function previewAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // Path 1: Bearer header present — delegate to standard auth middleware
  if (authHeader?.startsWith('Bearer ')) {
    authMiddleware(req, res, next);
    return;
  }

  // Path 2: preview_token query parameter
  const previewToken = req.query['preview_token'];
  if (typeof previewToken === 'string' && previewToken.length > 0) {
    const claims = verifyPreviewToken(previewToken);

    if (!claims) {
      logger.info('Invalid or expired preview token', {
        correlationId: req.correlationId ?? 'unknown',
      });
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired preview token',
        correlationId: req.correlationId ?? 'unknown',
      });
      return;
    }

    // SECURITY: Verify the token's previewId matches the URL previewId.
    // Prevents using a token issued for one preview to access another.
    const urlPreviewId = req.params['previewId'];
    if (claims.previewId !== urlPreviewId) {
      logger.warn('Preview token previewId mismatch', {
        tokenPreviewId: claims.previewId,
        urlPreviewId,
        correlationId: req.correlationId ?? 'unknown',
      });
      res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Preview token does not match requested preview',
        correlationId: req.correlationId ?? 'unknown',
      });
      return;
    }

    req.auth = previewTokenToAuthContext(claims);
    next();
    return;
  }

  // No credential provided
  res.status(401).json({
    code: 'UNAUTHORIZED',
    message: 'Authentication required to access previews',
    correlationId: req.correlationId ?? 'unknown',
  });
}
