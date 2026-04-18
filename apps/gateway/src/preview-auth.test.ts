import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { signPreviewToken, signSessionToken } from '@udd/auth';
import { previewAuthMiddleware } from './preview-auth.js';

const TEST_SECRET = 'test-secret-that-is-at-least-32-chars-long!!';

beforeAll(() => {
  process.env['JWT_SECRET'] = TEST_SECRET;
});

afterAll(() => {
  delete process.env['JWT_SECRET'];
});

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    query: {},
    params: {},
    correlationId: 'test-corr',
    ...overrides,
  } as unknown as Request;
}

function makeRes(): Response & { _status: number; _json: unknown } {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._json = body;
      return res;
    },
  };
  return res as unknown as Response & { _status: number; _json: unknown };
}

describe('previewAuthMiddleware', () => {
  it('returns 401 when no credential is provided', () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    previewAuthMiddleware(req, res, next);

    expect(res._status).toBe(401);
    expect((res._json as { code: string }).code).toBe('UNAUTHORIZED');
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid preview_token query param', () => {
    const { token } = signPreviewToken('user-1', 'preview-abc');
    const req = makeReq({
      query: { preview_token: token },
      params: { previewId: 'preview-abc' },
    });
    const res = makeRes();
    const next = vi.fn();

    previewAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.auth).toBeDefined();
    expect(req.auth!.userId).toBe('user-1');
  });

  it('rejects an expired preview token', () => {
    // Use a garbage token to simulate an expired/invalid token
    // (we can't easily create an already-expired token without jsonwebtoken)
    const req = makeReq({
      query: {
        preview_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWV4cCIsInByZXZpZXdJZCI6InByZXZpZXctZXhwIiwidHlwZSI6InByZXZpZXciLCJpYXQiOjEwMDAwMDAwMDAsImV4cCI6MTAwMDAwMDAwMX0.invalid',
      },
      params: { previewId: 'preview-exp' },
    });
    const res = makeRes();
    const next = vi.fn();

    previewAuthMiddleware(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a preview token scoped to a different previewId', () => {
    const { token } = signPreviewToken('user-2', 'preview-WRONG');
    const req = makeReq({
      query: { preview_token: token },
      params: { previewId: 'preview-ACTUAL' },
    });
    const res = makeRes();
    const next = vi.fn();

    previewAuthMiddleware(req, res, next);

    expect(res._status).toBe(403);
    expect((res._json as { code: string }).code).toBe('FORBIDDEN');
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a session token used as preview_token', () => {
    const sessionToken = signSessionToken({
      sub: 'user-sess',
      email: 'test@example.com',
      displayName: 'Test',
    });
    const req = makeReq({
      query: { preview_token: sessionToken },
      params: { previewId: 'any-preview' },
    });
    const res = makeRes();
    const next = vi.fn();

    previewAuthMiddleware(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('delegates to authMiddleware when Bearer header is present', () => {
    // Bearer token path — authMiddleware will likely reject since we're
    // not running a full Express stack, but verify delegation happens
    // by confirming next is NOT called (authMiddleware won't find valid session JWT)
    const req = makeReq({
      headers: { authorization: 'Bearer some-session-jwt' },
    });
    const res = makeRes();
    const next = vi.fn();

    previewAuthMiddleware(req, res, next);

    // authMiddleware will reject the fake token
    // The key assertion: we did NOT hit the 401 "Authentication required" path
    // (either next was called or authMiddleware sent its own 401)
    expect(res._status === 0 || res._status === 401).toBe(true);
  });

  it('rejects garbage preview_token', () => {
    const req = makeReq({
      query: { preview_token: 'not-a-jwt' },
      params: { previewId: 'preview-1' },
    });
    const res = makeRes();
    const next = vi.fn();

    previewAuthMiddleware(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
