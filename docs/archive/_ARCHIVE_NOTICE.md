# ARCHIVE NOTICE

**This directory is non-authoritative.**

Files in `docs/archive/` are historical materials that have been superseded, are no longer accurate, or are no longer relevant to current implementation work.

## Exclusion rule

Do not use content from this directory to guide implementation decisions. Do not treat archived files as describing current system behavior, current constraints, or current architectural requirements.

When an agent or contributor reads this repository for implementation context, `docs/archive/` must be explicitly excluded from the active context window. The authoritative documentation is in `docs/` (excluding this subdirectory). The authoritative index is `docs/_INDEX.md`.

## What belongs here

Files should be moved here when they:
- Describe a build phase that is now complete and whose guidance is no longer operative
- Contain scaffolding instructions that were one-time-use
- Describe architectural decisions that have since been superseded (keep the superseding ADR in `docs/adr/`)
- Were context or instruction files intended for a specific agent session, not for ongoing use

## What does NOT belong here

- Currently accepted ADRs (those live in `docs/adr/`)
- Operational runbooks (those live in `docs/runbooks/`)
- Any file that still describes current system behavior

## How to archive a file

1. Move the file to `docs/archive/`
2. Add a one-line comment at the top: `<!-- ARCHIVED: {reason} — superseded by {new file or decision} -->`
3. Remove the file from `docs/_INDEX.md`
4. Remove any links to it from authoritative documents

## Current archived files

*(None. The archive is currently empty.)*

When the first file is archived, update this list.
