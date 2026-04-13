# Runbook: Database Migration Rollout

**Status:** Canonical  
Back to [docs/_INDEX.md](../_INDEX.md).

## Use this runbook when

- a PR adds or changes a migration
- a hosted deploy needs a schema change
- local development breaks after a schema change

## Rules

- Migrations are additive first.
- Do not drop or rename in the same deploy that introduces the replacement.
- Redeploy old code before attempting a rollback migration.

## Rollout

1. Backup the target database.
2. Build `@udd/database`.
3. Run `pnpm --filter @udd/database migrate`.
4. Verify `schema_migrations`.
5. Run smoke checks against affected tables.
6. Deploy the services that depend on the new schema.

## Verification

```sql
SELECT version, applied_at
FROM schema_migrations
ORDER BY applied_at DESC;
```

## Rollback posture

- Prefer redeploying the previous compatible application build.
- If schema rollback is unavoidable, ship a new migration for it.

## Notes

- Workflow and infra drift around deploy automation exists in the repo today. That drift does not change the migration safety rules.
