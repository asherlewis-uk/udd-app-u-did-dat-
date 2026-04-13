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
12. [observability.md](observability.md)
13. [ENV_CONTRACT.md](ENV_CONTRACT.md)
14. [LOCAL_DEV.md](LOCAL_DEV.md)
15. [repo-map.md](repo-map.md)
16. [implementation-gaps.md](implementation-gaps.md)
17. [change-protocol.md](change-protocol.md)
18. [quality-gates.md](quality-gates.md)
19. Relevant ADRs in [adr/](adr/)
20. Relevant runbooks in [runbooks/](runbooks/)

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
