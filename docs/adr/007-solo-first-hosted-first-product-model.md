# ADR 007: Solo-First Hosted-First Product Model

**Status:** Canonical  
**Date:** 2026-04-13  
Back to [docs/_INDEX.md](../_INDEX.md).

## Context

Docs had drifted toward a general multi-tenant collaboration platform story. The product needs a clear source of truth.

## Decision

The canonical product model is:

- solo-first
- hosted-first
- polyglot
- AI-native
- local development supported

The product is not defined by team workspaces, org admin, or collaboration-first behavior.

## Consequences

- Canonical docs optimize for one builder using hosted web and hosted iOS surfaces.
- Collaboration support may exist, but it is not the product center.
- Any contrary file is stale unless backed by a newer ADR.
