-- Migration: 003_fix_sandbox_lease_constraint
-- Replace the flawed full UNIQUE constraint on sandbox_leases with a partial
-- unique index that prevents port conflicts among non-terminal lease states only.
--
-- The old constraint UNIQUE (worker_host, host_port, lease_state) allowed
-- two simultaneous leases on the same port as long as they had different states,
-- which defeated the purpose of preventing port double-allocation.
-- It was also DEFERRABLE INITIALLY DEFERRED, widening the TOCTOU window.

-- Step 1: Drop the existing flawed constraint
ALTER TABLE sandbox_leases
  DROP CONSTRAINT IF EXISTS sandbox_leases_worker_host_host_port_lease_state_key;

-- Step 2: Add a partial unique index.
-- At most ONE non-terminal lease may exist per (worker_host, host_port).
-- Terminal states are: released, orphaned.
-- This means pending, active, and releasing leases all compete for uniqueness —
-- exactly the invariant needed to prevent port double-allocation.
CREATE UNIQUE INDEX idx_sandbox_leases_active_port
  ON sandbox_leases (worker_host, host_port)
  WHERE lease_state NOT IN ('released', 'orphaned');
