# Documentation Index

Back to the canonical entrypoint: this file.

This index defines the canonical documentation set, the reading order for humans and coding agents, and the conflict rules for the repo.

## Canonical Reading Order

1. [product-scope.md](product-scope.md)
2. [overview.md](overview.md)
3. [architecture.md](architecture.md)
4. [domain-model.md](domain-model.md)
5. [execution-modes.md](execution-modes.md)
6. [security-model.md](security-model.md)
7. [service-catalog.md](service-catalog.md)
8. [runtime.md](runtime.md)
9. [contracts.md](contracts.md)
10. [flows.md](flows.md)
11. [constraints.md](constraints.md)
12. [ui-material-system.md](ui-material-system.md)
13. [observability.md](observability.md)
14. [ENV_CONTRACT.md](ENV_CONTRACT.md)
15. [LOCAL_DEV.md](LOCAL_DEV.md)
16. [repo-map.md](repo-map.md)
17. [implementation-gaps.md](implementation-gaps.md)
18. [change-protocol.md](change-protocol.md)
19. [quality-gates.md](quality-gates.md)
20. Relevant ADRs in [adr/](adr/) — see index below
21. Relevant runbooks in [runbooks/](runbooks/)

## ADR Index

| ADR                                                       | Title                                   | Status                          |
| --------------------------------------------------------- | --------------------------------------- | ------------------------------- |
| [001](adr/001-split-control-worker-plane.md)              | Split control/worker plane              | Canonical                       |
| [002](adr/002-port-mapped-preview-proxy.md)               | Port-mapped preview proxy               | Canonical                       |
| [003](adr/003-workspace-tenancy.md)                       | Workspace tenancy                       | Superseded by ADR 007, 010, 013 |
| [004](adr/004-microvm-isolation.md)                       | MicroVM-per-session isolation           | Superseded by ADR 008, 014      |
| [005](adr/005-model-provider-adapter-boundary.md)         | Model provider adapter boundary         | Canonical                       |
| [006](adr/006-external-secret-manager.md)                 | External secret manager                 | Canonical                       |
| [007](adr/007-solo-first-hosted-first-product-model.md)   | Solo-first hosted-first product model   | Canonical                       |
| [008](adr/008-hosted-execution-canonical.md)              | Hosted execution canonical              | Canonical                       |
| [009](adr/009-local-development-supported-mode.md)        | Local development supported mode        | Canonical                       |
| [010](adr/010-project-centered-identity-model.md)         | Project-centered identity model         | Canonical                       |
| [011](adr/011-hosted-preview-default.md)                  | Hosted preview default                  | Canonical                       |
| [012](adr/012-web-and-ios-first-class-client-surfaces.md) | Web and iOS first-class client surfaces | Canonical                       |
| [013](adr/013-thin-workspace-migration-strategy.md)       | Thin-workspace migration strategy       | Canonical                       |
| [014](adr/014-container-per-session-isolation.md)         | Container-per-session isolation         | Canonical                       |

## Canonical vs Historical

- Canonical docs: every file named in the reading order above.
- Historical but still relevant: ADRs and runbooks, provided their status header says they are current, current for hosted operations, or current for supported local development.
- Historical but non-authoritative: anything in [archive/](archive/), including archived planning docs.

## Source Of Truth By Concern

- Product scope: [product-scope.md](product-scope.md)
- Product overview: [overview.md](overview.md)
- Architecture: [architecture.md](architecture.md)
- Domain model: [domain-model.md](domain-model.md)
- Execution model: [execution-modes.md](execution-modes.md) and [runtime.md](runtime.md)
- Security: [security-model.md](security-model.md)
- Internal boundaries and interfaces: [contracts.md](contracts.md)
- Environment and config: [ENV_CONTRACT.md](ENV_CONTRACT.md)
- Operations: [runbooks/](runbooks/)
- UI material system / hosted web rendering: [ui-material-system.md](ui-material-system.md)
- Observability: [observability.md](observability.md)
- Known implementation drift: [implementation-gaps.md](implementation-gaps.md)

## Conflict Rules

If canonical docs conflict, use this priority order:

1. `docs/product-scope.md`
2. `docs/architecture.md`
3. `docs/domain-model.md`
4. `docs/execution-modes.md`
5. `docs/security-model.md`
6. `docs/contracts.md`
7. `docs/ENV_CONTRACT.md`
8. runbooks
9. archived docs

Root-file precedence is separate:
`AGENTS.md` > canonical-doc priority defined here > `AI.md` > `GEMINI.md` > `README.md`

If any non-canonical file conflicts with the rules above, treat that file as stale and record the conflict in [implementation-gaps.md](implementation-gaps.md).
