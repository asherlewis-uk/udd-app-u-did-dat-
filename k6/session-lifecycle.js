/**
 * k6 session lifecycle load test
 *
 * Tests concurrent session create → start → stop under realistic load.
 *
 * Usage (dev / staging only — never run against production):
 *   k6 run --env TARGET_ENV=dev --env API_BASE_URL=https://dev-api.udd.example.com \
 *          --env AUTH_TOKEN=<bearer-token> k6/session-lifecycle.js
 *
 * The script aborts immediately if TARGET_ENV=production is set to prevent
 * accidental load tests against the live environment.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// ─── Safety guard ─────────────────────────────────────────────────────────────

if (__ENV.TARGET_ENV === 'production') {
  throw new Error(
    '[k6] Refusing to run load test against TARGET_ENV=production. ' +
    'Use dev or staging only.',
  );
}

// ─── Configuration ────────────────────────────────────────────────────────────

const BASE_URL   = __ENV.API_BASE_URL ?? 'http://localhost:3001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN   ?? '';

// Workspace / project IDs that must exist in the target environment.
const WORKSPACE_ID = __ENV.WORKSPACE_ID ?? '00000000-0000-0000-0000-000000000001';
const PROJECT_ID   = __ENV.PROJECT_ID   ?? '00000000-0000-0000-0000-000000000002';

// ─── Thresholds & VU ramp ─────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '10s', target: 10  },  // ramp up
    { duration: '40s', target: 50  },  // sustained load
    { duration: '10s', target: 0   },  // ramp down
  ],
  thresholds: {
    http_req_failed:   ['rate<0.01'],          // <1% error rate
    http_req_duration: ['p(95)<2000'],         // p95 latency < 2s
    session_errors:    ['count<5'],            // hard cap on unexpected errors
  },
};

const sessionErrors = new Counter('session_errors');
const sessionSuccess = new Rate('session_lifecycle_success');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders() {
  return {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type':  'application/json',
  };
}

// ─── Main VU function ─────────────────────────────────────────────────────────

export default function () {
  const headers = authHeaders();

  // 1. Create session
  const createRes = http.post(
    `${BASE_URL}/projects/${PROJECT_ID}/sessions`,
    JSON.stringify({ idleTimeoutSeconds: 300 }),
    { headers },
  );

  const createOk = check(createRes, {
    'create session: status 201': (r) => r.status === 201,
    'create session: has id':     (r) => !!r.json('data.id'),
  });

  if (!createOk) {
    sessionErrors.add(1);
    sessionSuccess.add(false);
    return;
  }

  const sessionId = createRes.json('data.id');

  sleep(0.2);

  // 2. Start session (simulate worker assignment)
  const startRes = http.post(
    `${BASE_URL}/sessions/${sessionId}/start`,
    JSON.stringify({
      workerHost: '10.0.0.1',
      hostPort:   32100,
    }),
    { headers },
  );

  check(startRes, {
    'start session: status 200 or 409': (r) => r.status === 200 || r.status === 409,
  });

  sleep(0.5);

  // 3. Stop session
  const stopRes = http.post(
    `${BASE_URL}/sessions/${sessionId}/stop`,
    null,
    { headers },
  );

  const stopOk = check(stopRes, {
    'stop session: status 200 or 204': (r) => r.status === 200 || r.status === 204,
  });

  sessionSuccess.add(createOk && stopOk);
  if (!stopOk) sessionErrors.add(1);

  sleep(0.3);
}
