# ADR 009: Local Development Is a Supported Mode

**Status:** Canonical  
**Date:** 2026-04-13  
Back to [docs/_INDEX.md](../_INDEX.md).

## Context

Even with a hosted-first product, contributors need a truthful local workflow for development, debugging, and validation.

## Decision

Keep local development as a supported mode with explicit documentation.

- It is for product development and operator validation.
- It does not redefine the product as local-first.
- Its limitations must be documented directly when the repo cannot yet provide a smooth local stack.

## Consequences

- `docs/LOCAL_DEV.md` is required and must stay honest.
- Local runtime pain is an implementation gap, not a reason to rewrite product scope.
