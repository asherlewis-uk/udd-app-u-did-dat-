# ADR 004: MicroVM-per-Session Isolation

**Status:** Superseded  
**Date:** 2026-04-11  
**Superseded by:** [ADR 008](./008-hosted-execution-canonical.md)  
Back to [docs/_INDEX.md](../_INDEX.md).

## Context

This ADR captured the original desired isolation target for hosted execution.

## Historical decision

It asserted a MicroVM-per-session model as the hosted runtime isolation strategy.

## Current status

The current repo does not implement MicroVM provisioning. Strong hosted isolation is still required, but the product docs cannot pretend this ADR describes current runtime truth.

ADR 008 replaces this with a clearer hosted-execution decision that keeps the isolation requirement while admitting the current implementation gap.
