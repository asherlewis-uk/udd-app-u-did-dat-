import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@udd/config';
import type { Permission } from '@udd/contracts';
import type { AuthContext, SessionClaims } from './types.js';
import { hasPermission } from './rbac.js';

// Augment Express Request with auth context
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      correlationId?: string;
    }
  }
}

const MIN_JWT_SECRET_LENGTH = 32; // 256 bits minimum entropy

function getJwtSecret(): string {
  const secret = config.auth.jwtSecret();
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters (got ${secret.length}). ` +
      `Use a cryptographically random value: openssl rand -base64 48`,
    );
  }
  return secret;
}

/**
 * Extract and verify the session JWT, attach auth context to req.auth.
 * Returns 401 if token is missing or invalid.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Missing or malformed Authorization header',
      correlationId: req.correlationId ?? 'unknown',
    });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const claims = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    }) as SessionClaims;
    const authCtx: AuthContext = {
      userId: claims.sub,
      email: claims.email,
      displayName: claims.displayName,
      grantedPermissions: claims.grantedPermissions ?? [],
    };
    if (claims.workspaceId !== undefined) authCtx.workspaceId = claims.workspaceId;
    if (claims.workspaceRole !== undefined) authCtx.workspaceRole = claims.workspaceRole;
    req.auth = authCtx;
    next();
  } catch {
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired session token',
      correlationId: req.correlationId ?? 'unknown',
    });
  }
}

/**
 * Require a specific permission. Must be used after authMiddleware.
 * Returns 403 if the authenticated user lacks the permission.
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = req.auth;
    if (!auth) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        correlationId: req.correlationId ?? 'unknown',
      });
      return;
    }

    if (!hasPermission(auth, permission)) {
      res.status(403).json({
        code: 'FORBIDDEN',
        message: `Permission '${permission}' required`,
        correlationId: req.correlationId ?? 'unknown',
      });
      return;
    }

    next();
  };
}

/**
 * Issue a signed session JWT from claims.
 * Used by the session exchange endpoint.
 */
export function signSessionToken(claims: Omit<SessionClaims, 'iat' | 'exp'>): string {
  const expiresIn = config.auth.jwtExpiresInSeconds();
  return jwt.sign(claims, getJwtSecret(), { algorithm: 'HS256', expiresIn });
}
