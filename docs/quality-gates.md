# Quality Gates

Back to [docs/\_INDEX.md](./_INDEX.md).

## Canonical merge gates

1. No new organization or workspace abstraction becomes part of the canonical product model without an ADR.
2. No change may demote the hosted web surface to satisfy iOS requirements without an ADR.
3. Web and iOS client-facing contract changes must be reviewed as first-class product changes.
4. No new stack support lands without a stack-registry decision, tests, and docs.
5. No new provider integration lands without adapter compliance and secret-manager rules.
6. No doc/code divergence is allowed without an entry in [docs/implementation-gaps.md](./implementation-gaps.md).
7. No hidden environment variable is allowed outside [docs/ENV_CONTRACT.md](./ENV_CONTRACT.md).
8. Every new operator workflow needs a runbook or an explicit statement that no runbook is needed.

## Automated checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm build
```

## Doc gates

- `docs/_INDEX.md` stays the single docs entrypoint.
- Root instruction precedence must remain: `AGENTS.md` > canonical-doc priority in `_INDEX` > `AI.md` > `GEMINI.md` > `README.md`.
- If any file conflicts with that precedence, the file is stale and must be logged in [docs/implementation-gaps.md](./implementation-gaps.md).
- ADRs and runbooks must carry explicit status headers.

## Runtime and client gates

- Hosted-first assumptions must stay explicit in architecture and runtime docs.
- Web and iOS remain first-class client surfaces.
- iOS conformance tests must verify that shared contracts from `packages/contracts` are consumed correctly by the iOS client. These tests are a required quality gate for contract changes that affect iOS.
- Collaboration features must not be promoted into the product center without an ADR. Collaboration is currently frozen as dormant.
- Runtime or preview behavior changes must be reflected in `docs/runtime.md`, `docs/flows.md`, and the relevant runbooks.

## Config and secret gates

- New config must appear in [docs/ENV_CONTRACT.md](./ENV_CONTRACT.md).
- Plaintext provider credentials remain forbidden in database tables and logs.
- Provider SDK imports stay behind the adapter boundary.

## Local development gates

- If a local workflow is required to operate or verify the repo, [docs/LOCAL_DEV.md](./LOCAL_DEV.md) must describe it.
- If local development remains awkward because of implementation reality, document the awkwardness directly instead of hiding it.
