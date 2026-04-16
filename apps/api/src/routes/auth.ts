import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomBytes, createHash } from 'crypto';
import { signSessionToken, getEffectivePermissions } from '@udd/auth';
import type { AuthContext } from '@udd/auth';
import { getContext } from '../context.js';
import { createAppError } from '../middleware/error.js';

// Strict rate limiter for auth endpoints — prevents brute-force against
// PKCE state and authorization code exchange.  20 requests per IP per
// 15-minute window is generous for legitimate auth flows.
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
});

const router: Router = Router();

// ============================================================
// PKCE + CSRF state store
// Maps state → { codeVerifier, expiresAt }
// Entries are consumed on first use (one-time) and pruned by
// the interval below.
// ============================================================

interface PkceEntry {
  codeVerifier: string;
  expiresAt: number; // ms since epoch
}

const PKCE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const pkceStore = new Map<string, PkceEntry>();

// Prune expired PKCE state entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [state, entry] of pkceStore) {
    if (entry.expiresAt <= now) {
      pkceStore.delete(state);
    }
  }
}, 60_000).unref(); // .unref() so the interval doesn't keep the process alive

// ============================================================
// Pure crypto helpers (Node.js built-ins only)
// ============================================================

function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

function generateState(): string {
  return randomBytes(32).toString('base64url');
}

// ============================================================
// POST /auth/session/pkce-init
// Generates a PKCE code_verifier + code_challenge and a CSRF
// state nonce.  The client must echo `state` back to
// /auth/session/exchange.
// ============================================================

router.post('/auth/session/pkce-init', authRateLimit, (_req, res) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  pkceStore.set(state, {
    codeVerifier,
    expiresAt: Date.now() + PKCE_TTL_MS,
  });

  return res.json({
    data: {
      state,
      codeChallenge,
      codeChallengeMethod: 'S256',
    },
  });
});

// ============================================================
// POST /auth/session/exchange
// Body: { code: string, state: string }   — WorkOS AuthKit
//       authorization code + CSRF/PKCE state nonce.
//
// Returns a signed session JWT for use in subsequent
// authenticated requests.
// ============================================================

router.post('/auth/session/exchange', authRateLimit, async (req, res, next) => {
  try {
    const { code, state } = req.body as { code?: string; state?: string };

    if (!code || typeof code !== 'string') {
      return next(createAppError('code is required', 400, 'VALIDATION_ERROR'));
    }

    if (!state || typeof state !== 'string') {
      return next(createAppError('state is required', 400, 'VALIDATION_ERROR'));
    }

    // Validate PKCE/CSRF state — look up, check expiry, then consume
    const pkceEntry = pkceStore.get(state);

    if (!pkceEntry) {
      return next(createAppError('Invalid or unknown state parameter', 400, 'VALIDATION_ERROR'));
    }

    if (pkceEntry.expiresAt <= Date.now()) {
      pkceStore.delete(state);
      return next(createAppError('State parameter has expired', 400, 'VALIDATION_ERROR'));
    }

    // One-time use — delete before calling WorkOS to prevent replay
    pkceStore.delete(state);
    const { codeVerifier } = pkceEntry;

    const ctx = getContext();

    // Exchange code with WorkOS → get the WorkOS user (PKCE-verified)
    const workosUser = await ctx.auth.authenticateWithCode(code, codeVerifier);

    // Upsert local user record
    const displayName =
      [workosUser.firstName, workosUser.lastName].filter(Boolean).join(' ') ||
      workosUser.email.split('@')[0]!;

    const user = await ctx.users.upsert({
      externalAuthId: workosUser.id,
      email: workosUser.email,
      displayName,
      avatarUrl: workosUser.profilePictureUrl ?? null,
    });

    // Issue session JWT with resolved permissions (ADR 013 Phase 2).
    // Look up the user's home workspace membership and resolve effective
    // permissions at token-issuance time.  The JWT carries grantedPermissions
    // instead of workspace identity — workspace is internal tenancy only.
    const workspaces = await ctx.workspaces.findByUserId(user.id);
    const homeWorkspace = workspaces[0];

    let resolvedPermissions: import('@udd/contracts').Permission[] = [];
    if (homeWorkspace) {
      const membership = await ctx.memberships.findByUserAndWorkspace(user.id, homeWorkspace.id);
      if (membership) {
        const tempCtx: AuthContext = {
          userId: user.id,
          email: user.email,
          displayName: user.displayName,
          workspaceRole: membership.role,
          grantedPermissions: [],
        };
        resolvedPermissions = getEffectivePermissions(tempCtx);
      }
    }

    const token = signSessionToken({
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      grantedPermissions: resolvedPermissions,
    });

    return res.json({
      data: { token, userId: user.id },
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
