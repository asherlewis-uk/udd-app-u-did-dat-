# Overview

Back to [docs/_INDEX.md](./_INDEX.md).

## Who This Product Is For

UDD is for solo builders who want a hosted, AI-native development product that works across stacks and also provides a first-class iOS surface without turning the product into a workspace-centric team platform.

## What The Product Is

UDD is a hosted-first development environment and runtime product with two required client surfaces:
- the hosted web surface
- the iOS surface

Both surfaces operate against the same hosted project, session, preview, and AI boundaries.

## Primary Workflow

`idea -> choose or open project -> scaffold or edit with AI -> run in the hosted runtime -> preview through the hosted surface -> validate on web and iOS -> optionally export or deploy elsewhere`

Local development is supported for engineering, debugging, and validation, but it does not replace the hosted product story.

## What The Product Is Not

- Not a team-first workspace product
- Not an org-admin platform with RBAC as the product center
- Not an infrastructure ownership product where deployment is the main value proposition
- Not an iOS-first rewrite of a web product

## Major Subsystems

- Hosted web surface
- First-class iOS surface
- Public API and auth surface
- Hosted runtime and session orchestration
- Hosted preview system
- AI orchestration and provider configuration
- Provider, secret, storage, queue, billing, and notification adapters
- Supported local development path for builders and operators

## Supported Stack Philosophy

- The product is polyglot by default.
- Stack support belongs behind adapters, templates, and stack-specific modules rather than inside the product core.
- The current repo does not yet expose a first-class scaffold or stack registry layer as code. That gap is tracked in [implementation-gaps.md](implementation-gaps.md).
