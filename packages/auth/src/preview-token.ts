import jwt from 'jsonwebtoken';
import { config } from '@udd/config';
import type { AuthContext } from './types.js';

// ============================================================
// Preview Token — short-lived, preview-scoped JWT
//
// Used as an iframe/WKWebView-safe credential transport for
// hosted preview access. The token replaces the Bearer header
// as the auth transport ONLY on preview gateway routes.
//
// Security invariants:
//   - Token is signed with the same JWT_SECRET as session tokens
//   - Token type is 'preview' (distinct from session tokens)
//   - Token is scoped to a specific previewId and userId
//   - TTL is short (default 300s / 5 minutes)
//   - Gateway still performs FULL authorization on every request:
//     route lookup, state check, membership check, target validation
//   - Token alone is NEVER sufficient — it provides auth identity,
//     not authorization
// ============================================================

export interface PreviewTokenClaims {
  /** User ID */
  sub: string;
  /** Preview binding ID this token is scoped to */
  previewId: string;
  /** Token type discriminator */
  type: 'preview';
  /** Issued-at (epoch seconds) */
  iat: number;
  /** Expiry (epoch seconds) */
  exp: number;
}

const PREVIEW_TOKEN_TTL_SECONDS = 300; // 5 minutes
const MIN_JWT_SECRET_LENGTH = 32;

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
 * Sign a short-lived preview token for iframe/WKWebView access.
 * The token carries the user's identity and the specific previewId.
 */
export function signPreviewToken(
  userId: string,
  previewId: string,
): { token: string; expiresAt: string } {
  const payload: Omit<PreviewTokenClaims, 'iat' | 'exp'> = {
    sub: userId,
    previewId,
    type: 'preview',
  };
  const ttl = config.preview.tokenTtlSeconds();
  const token = jwt.sign(payload, getJwtSecret(), { algorithm: 'HS256', expiresIn: ttl });
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  return { token, expiresAt };
}

/**
 * Verify a preview token and extract claims.
 * Returns null if the token is invalid, expired, or not a preview token.
 */
export function verifyPreviewToken(token: string): PreviewTokenClaims | null {
  try {
    const claims = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    }) as PreviewTokenClaims;

    // Reject tokens that are not preview-typed (prevent session token reuse)
    if (claims.type !== 'preview') return null;
    if (!claims.sub || !claims.previewId) return null;

    return claims;
  } catch {
    return null;
  }
}

/**
 * Build an AuthContext from verified preview token claims.
 * The context has minimal fields — only what the gateway needs
 * to perform its authorization checks (userId for membership lookup).
 */
export function previewTokenToAuthContext(claims: PreviewTokenClaims): AuthContext {
  return {
    userId: claims.sub,
    email: '',
    displayName: '',
    grantedPermissions: [],
  };
}
