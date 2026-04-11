# Runbook: Database Migration Rollout

## Principles

- Migrations must be **backward-compatible** — the new schema must work with both the old and new application version simultaneously.
- **Additive only**: add columns (nullable), add tables, add indexes. Never drop or rename in the same deploy.
- **Two-phase drops**: Phase 1 stop using the column, Phase 2 (separate deploy) drop it.
- Never run migrations without a backup.

## Pre-Migration Checklist

- [ ] Migration file added to `packages/database/src/migrations/` with correct sort order prefix.
- [ ] Migration is idempotent (safe to run twice).
- [ ] New columns are nullable or have safe defaults.
- [ ] Indexes use `CREATE INDEX CONCURRENTLY` to avoid table locks.
- [ ] Migration tested against a copy of production schema locally.
- [ ] Rollback plan documented.

## Rollout Procedure

### Step 1: Backup

```bash
pg_dump -Fc $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).dump
```

### Step 2: Run migration (production)

```bash
pnpm --filter="@udd/database" migrate
```

The migration runner is idempotent — already-applied migrations are skipped.

### Step 3: Verify

```sql
-- Check migration was applied
SELECT version, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;

-- Quick sanity check on affected tables
SELECT COUNT(*) FROM <new_or_altered_table>;
```

### Step 4: Deploy new application version

Deploy services via ECS after migration completes.

## Rollback

Migrations are not automatically reversible. To rollback:

1. **Redeploy the previous application version** (it is schema-compatible — backward compatibility requirement).
2. If the migration added a table or column not yet populated, it is safe to leave in place.
3. If a rollback requires schema removal, write and test a rollback migration, then apply it as a new migration file.

## Partitioned Table Maintenance

For `audit_logs`, `usage_meter_events`, `pipeline_runs`:

```sql
-- Create next month's partition (run monthly via cron)
CREATE TABLE audit_logs_2026_06 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```

Consider automating this with `pg_partman`.
