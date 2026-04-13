# ADR 005: Model Provider Adapter Boundary

**Status:** Canonical  
**Date:** 2026-04-11  
Back to [docs/_INDEX.md](../_INDEX.md).

## Context

The product is AI-native and provider-agnostic. Core services must not couple themselves to provider SDKs or provider-specific credential handling.

## Decision

All model invocations go through the model-provider adapter boundary in `packages/adapters`.

- Core services use normalized provider contracts.
- Provider SDKs stay inside adapter implementations.
- Credentials are fetched at invocation time and kept out of logs, traces, and durable storage.

## Consequences

- Adding a provider means adding or extending an adapter.
- Provider churn does not rewrite core product logic.
- This boundary remains canonical and should not be weakened.
