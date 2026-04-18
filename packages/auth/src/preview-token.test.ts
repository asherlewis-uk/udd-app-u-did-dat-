import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  signPreviewToken,
  verifyPreviewToken,
  previewTokenToAuthContext,
} from './preview-token.js';
import type { PreviewTokenClaims } from './preview-token.js';

const TEST_SECRET = 'test-secret-that-is-at-least-32-chars-long!!';

beforeAll(() => {
  process.env['JWT_SECRET'] = TEST_SECRET;
});

afterAll(() => {
  delete process.env['JWT_SECRET'];
});

describe('signPreviewToken', () => {
  it('returns a token and ISO expiresAt', () => {
    const result = signPreviewToken('user-1', 'preview-abc');
    expect(result.token).toBeTypeOf('string');
    expect(result.token.split('.')).toHaveLength(3); // JWT format
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('embeds correct claims', () => {
    const { token } = signPreviewToken('user-2', 'preview-xyz');
    const decoded = jwt.decode(token) as PreviewTokenClaims;
    expect(decoded.sub).toBe('user-2');
    expect(decoded.previewId).toBe('preview-xyz');
    expect(decoded.type).toBe('preview');
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  it('uses configurable TTL from env', () => {
    process.env['PREVIEW_TOKEN_TTL_SECONDS'] = '60';
    const { token } = signPreviewToken('user-3', 'preview-ttl');
    const decoded = jwt.decode(token) as PreviewTokenClaims;
    expect(decoded.exp - decoded.iat).toBe(60);
    delete process.env['PREVIEW_TOKEN_TTL_SECONDS'];
  });
});

describe('verifyPreviewToken', () => {
  it('returns claims for a valid preview token', () => {
    const { token } = signPreviewToken('user-v1', 'preview-v1');
    const claims = verifyPreviewToken(token);
    expect(claims).not.toBeNull();
    expect(claims!.sub).toBe('user-v1');
    expect(claims!.previewId).toBe('preview-v1');
    expect(claims!.type).toBe('preview');
  });

  it('returns null for an expired token', () => {
    const token = jwt.sign(
      { sub: 'user-exp', previewId: 'preview-exp', type: 'preview' },
      TEST_SECRET,
      { algorithm: 'HS256', expiresIn: -10 },
    );
    expect(verifyPreviewToken(token)).toBeNull();
  });

  it('returns null for a token signed with a different secret', () => {
    const token = jwt.sign(
      { sub: 'user-bad', previewId: 'preview-bad', type: 'preview' },
      'wrong-secret-that-is-at-least-32-chars-long!!',
      { algorithm: 'HS256', expiresIn: 300 },
    );
    expect(verifyPreviewToken(token)).toBeNull();
  });

  it('rejects a session token (type !== preview)', () => {
    const token = jwt.sign(
      { sub: 'user-sess', type: 'session', workspaceId: 'ws-1' },
      TEST_SECRET,
      { algorithm: 'HS256', expiresIn: 300 },
    );
    expect(verifyPreviewToken(token)).toBeNull();
  });

  it('rejects a token with no type', () => {
    const token = jwt.sign({ sub: 'user-notype', previewId: 'preview-notype' }, TEST_SECRET, {
      algorithm: 'HS256',
      expiresIn: 300,
    });
    expect(verifyPreviewToken(token)).toBeNull();
  });

  it('rejects a token with missing previewId', () => {
    const token = jwt.sign({ sub: 'user-nopid', type: 'preview' }, TEST_SECRET, {
      algorithm: 'HS256',
      expiresIn: 300,
    });
    expect(verifyPreviewToken(token)).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(verifyPreviewToken('not.a.jwt')).toBeNull();
    expect(verifyPreviewToken('')).toBeNull();
  });
});

describe('previewTokenToAuthContext', () => {
  it('maps claims to AuthContext with correct userId', () => {
    const claims: PreviewTokenClaims = {
      sub: 'user-ctx',
      previewId: 'preview-ctx',
      type: 'preview',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
    };
    const ctx = previewTokenToAuthContext(claims);
    expect(ctx.userId).toBe('user-ctx');
    expect(ctx.grantedPermissions).toEqual([]);
  });
});
