# Constraints

Back to [docs/_INDEX.md](./_INDEX.md).

## Product invariants

1. **Solo-first is non-negotiable.** The product is optimized for one builder at a time, even when hosted services or comments exist in code.
2. **Hosted-first is canonical.** Local development is supported, but it does not redefine the product story.
3. **Web and iOS are first-class client surfaces.** iOS is required. Web remains the primary hosted surface unless an explicit ADR says otherwise.
4. **Polyglot support stays.** Core architecture must not collapse into a single-stack product.
5. **Organization and workspace abstractions are not the canonical product model.** If code still depends on them, that is current implementation reality, not the product center.
6. **Deployment and export are adapter-based.** The product may hand work off to external targets, but deployment is not the core product.

## Technical invariants

1. **Provider credentials never live in plaintext in product tables.**
2. **Provider SDKs stay behind the adapter boundary.**
3. **Stack-specific logic does not leak into core product services.**
4. **Preview targets must never be client-controlled.**
5. **Hidden environment variables are not allowed.** If config exists, it must be documented in [docs/ENV_CONTRACT.md](./ENV_CONTRACT.md).
6. **Docs must be updated whenever product scope, architecture, client-surface priority, or runtime boundaries change.**

## Governance invariants

1. **No new organization, workspace, or RBAC-heavy product model becomes canonical without an ADR.**
2. **No change may silently demote the hosted web surface in the name of iOS support.** That requires an explicit ADR.
3. **No new stack support lands without a registry decision, tests, and docs.**
4. **No new provider integration lands without adapter and secret-manager compliance.**
5. **If code and docs diverge, the divergence must be logged in [docs/implementation-gaps.md](./implementation-gaps.md).**

## Current implementation notes

- The repo still contains workspace-shaped auth, routes, and schema. That does not change these constraints.
- Collaboration and Android code exist, but neither redefines the canonical product center.
- Workflow files are read-only in this pass. Any mismatch between workflows and these constraints belongs in [docs/implementation-gaps.md](./implementation-gaps.md).
