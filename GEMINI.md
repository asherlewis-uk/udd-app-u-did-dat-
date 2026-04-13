# GEMINI

Gemini-specific guidance defers to [AGENTS.md](AGENTS.md) first and [docs/_INDEX.md](docs/_INDEX.md) second.

Read in this order:
1. [AGENTS.md](AGENTS.md)
2. [docs/_INDEX.md](docs/_INDEX.md)
3. The canonical docs named in the index for the area you are changing
4. [docs/implementation-gaps.md](docs/implementation-gaps.md) for code, workflow, or stale-doc drift

Precedence is:
`AGENTS.md` > canonical-doc priority defined in `docs/_INDEX.md` > `AI.md` > `GEMINI.md` > `README.md`

Canonical docs win over this file. If `GEMINI.md` conflicts with `AGENTS.md` or the canonical-doc priority from `docs/_INDEX.md`, treat `GEMINI.md` as stale and record that conflict in [docs/implementation-gaps.md](docs/implementation-gaps.md).

Do not assume:
- local-first is the canonical product story
- iOS replaces or downgrades the hosted web surface
- workspace tenancy is the canonical product model
- workflow files are authoritative architecture documents

Before changing code, read:
- [docs/constraints.md](docs/constraints.md)
- [docs/change-protocol.md](docs/change-protocol.md)
- [docs/quality-gates.md](docs/quality-gates.md)
