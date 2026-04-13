# ADR 008: Hosted Execution Is Canonical

**Status:** Canonical  
**Date:** 2026-04-13  
Back to [docs/_INDEX.md](../_INDEX.md).

## Context

The product story needs a default runtime mode. The repo already centers hosted services, runtime allocation, and hosted preview infrastructure.

## Decision

Hosted execution is the canonical runtime mode.

- Run sessions are expected to execute on hosted infrastructure.
- Hosted preview is the default preview path.
- Local execution remains a supported development mode.
- Strong hosted isolation remains required even where current implementation is incomplete.

## Consequences

- Runtime docs and service planning use hosted execution as the baseline.
- Local development remains supported but non-canonical.
- This ADR supersedes ADR 004 as the authoritative runtime baseline.
