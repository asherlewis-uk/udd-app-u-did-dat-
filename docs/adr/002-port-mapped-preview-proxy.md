# ADR 002: Hosted Preview Gateway Uses Path-Based Preview Routes

**Status:** Canonical  
**Date:** 2026-04-11  
Back to [docs/_INDEX.md](../_INDEX.md).

## Context

Hosted execution needs a stable preview surface that works for the hosted web client and the iOS client without exposing runtime-host addresses directly.

## Decision

Use hosted path-based preview routes:

`/preview/{previewId}/...`

The gateway:

1. resolves the preview binding from authoritative data,
2. validates auth and membership,
3. enforces route state and expiry,
4. validates the runtime target,
5. proxies to the bound runtime host and port.

## Consequences

- Hosted preview remains consistent across web and iOS.
- Preview IDs do not grant access by themselves.
- The gateway must not accept client-selected upstream targets.
- This ADR stays canonical because the hosted-first preview model still depends on it.
