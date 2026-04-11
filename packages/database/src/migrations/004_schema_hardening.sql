-- Migration: 004_schema_hardening
-- Security audit findings C-2 and M-1.
--
-- C-2: worker_capacity_snapshots.worker_host lacks a UNIQUE constraint.
--      The upsertSnapshot() code uses ON CONFLICT (worker_host) which
--      requires uniqueness; without the constraint the INSERT fails at
--      runtime.
--
-- M-1: Several numeric columns accept out-of-range values at the DB layer.
--      Adding CHECK constraints as defense-in-depth.

-- ============================================================
-- C-2: Add UNIQUE constraint on worker_host
-- ============================================================

ALTER TABLE worker_capacity_snapshots
  ADD CONSTRAINT uq_worker_capacity_worker_host UNIQUE (worker_host);

-- ============================================================
-- M-1: Bound numeric columns
-- ============================================================

-- sessions.idle_timeout_seconds: 1 second … 7 days
ALTER TABLE sessions
  ADD CONSTRAINT chk_sessions_idle_timeout
  CHECK (idle_timeout_seconds >= 1 AND idle_timeout_seconds <= 604800);

-- sessions.host_port: valid TCP port range (nullable — only set when assigned)
ALTER TABLE sessions
  ADD CONSTRAINT chk_sessions_host_port
  CHECK (host_port IS NULL OR (host_port >= 1 AND host_port <= 65535));

-- sandbox_leases.host_port: valid TCP port range
ALTER TABLE sandbox_leases
  ADD CONSTRAINT chk_sandbox_leases_host_port
  CHECK (host_port >= 1 AND host_port <= 65535);

-- worker_capacity_snapshots: slot counts must be non-negative and consistent
ALTER TABLE worker_capacity_snapshots
  ADD CONSTRAINT chk_worker_capacity_slots
  CHECK (total_slots >= 0 AND used_slots >= 0 AND used_slots <= total_slots);
