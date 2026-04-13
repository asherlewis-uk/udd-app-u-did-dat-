# ADR 006: External Secret Manager for Provider Credentials

**Status:** Canonical  
**Date:** 2026-04-11  
Back to [docs/\_INDEX.md](../_INDEX.md).

## Context

Users or operators provide credentials for external AI providers. Those credentials must be rotatable, auditable, and absent from product tables.

## Decision

Use an external secret manager for production provider credentials and store only secret references in product data.

Current repo reality:

- Production path: `GCPSecretManagerProvider`
- Development and test path: `InMemorySecretManagerProvider`
- **Decision (supersedes prior behavior):** `SECRET_MANAGER_PROVIDER` config flag is the sole selection authority for secret-manager provider. The legacy `NODE_ENV`-based selection in `apps/ai-orchestration` is deprecated and must be removed. See [docs/implementation-gaps.md](../implementation-gaps.md) and [docs/ENV_CONTRACT.md](../ENV_CONTRACT.md).
- Until the implementation change is applied, `apps/ai-orchestration` still selects via `NODE_ENV`. This is a known implementation gap, not the canonical behavior.

## Consequences

- Database compromise does not automatically reveal provider secrets.
- Secret rotation remains a product and operator concern, not a manual database edit.
- This decision remains canonical.
- The config-selection drift is an implementation gap, not a reason to weaken the boundary.
