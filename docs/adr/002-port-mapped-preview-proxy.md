# ADR 002: Port-Mapped Preview Proxy

**Status**: Accepted  
**Date**: 2026-04-11

## Context

When a user runs a web server inside their sandbox, they need to access it from a browser. Options considered:

1. **Subdomain per preview**: `{preview_id}.preview.yourdomain.com` — requires wildcard TLS and DNS propagation.
2. **Path-based proxy**: `/preview/{preview_id}/...` — single TLS cert, no DNS changes needed.
3. **Direct tunnel**: WebSocket tunnel to user's browser — complex, high latency.

## Decision

Use path-based proxy: `yourdomain.com/preview/{preview_id}/{path...}`

The gateway service:
1. Extracts the `preview_id` from the path.
2. Looks up the preview route binding in the DB (not cache-only — always authoritative).
3. Verifies the route is active, not expired, not revoked.
4. Verifies the requesting user is authenticated and is a workspace member with preview access.
5. Proxies to exactly `worker-host:allocated-port` from the DB record — no arbitrary override possible.

The `preview_id` is a random URL-safe token generated at route creation time.

## Consequences

- Single TLS certificate required.
- Gateway is a Tier 1 critical service — it must be highly available.
- Preview URL is stable for the lifetime of the route (not tied to the worker host or port directly in the URL).
- Route ID alone never grants access — authentication and authorization are always checked.
- Gateway must not cache route bindings beyond the request boundary to prevent stale lease exploitation.
