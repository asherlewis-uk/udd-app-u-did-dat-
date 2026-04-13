# Runbook: Local Runtime Failure

**Status:** Canonical  
Back to [docs/_INDEX.md](../_INDEX.md).

## Symptoms

- local service fails to boot
- port already in use
- dependency install fails
- local preview does not open
- required env var is missing

## Diagnosis

1. Check the failing process log first.
2. Confirm PostgreSQL and Redis are reachable.
3. Confirm required env vars from [docs/ENV_CONTRACT.md](../ENV_CONTRACT.md).
4. Check for port collisions, especially on `3000`.

## Port collision check

```powershell
Get-NetTCPConnection -LocalPort 3000,3002,3003,3004,3005,3006,3007,8080 -ErrorAction SilentlyContinue |
  Select-Object LocalPort, State, OwningProcess
```

## Common recoveries

- If `pnpm install` failed, clear the broken state and reinstall.
- If PostgreSQL or Redis is down, restart the local containers.
- If web conflicts with gateway on port `3000`, move web to `3006`.
- If usage-meter conflicts on `3000`, move it to another port.
- If preview behavior is failing, run `pnpm --filter @udd/gateway test` before assuming the hosted preview path is broken.

## Missing env recovery

- Re-export the env var in your current shell.
- Restart the affected process after changing env.
- If the variable is not documented, add it to [docs/implementation-gaps.md](../implementation-gaps.md) and [docs/ENV_CONTRACT.md](../ENV_CONTRACT.md).
