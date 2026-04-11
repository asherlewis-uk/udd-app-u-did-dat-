-- Migration 005: worker_host format constraint (P1-#8 SSRF hardening)
--
-- Adds a NOT VALID CHECK constraint that restricts worker_host values to
-- RFC-1918 / link-local private address prefixes (10.x, 172.16-31.x, 192.168.x)
-- and localhost.  NOT VALID defers the row scan so existing data is not
-- validated immediately; run VALIDATE CONSTRAINT in a follow-up maintenance
-- window to complete the constraint.
--
-- The constraint applies to all three tables that store worker_host:
--   sessions, sandbox_leases, worker_capacity_snapshots.

ALTER TABLE sessions
  ADD CONSTRAINT chk_sessions_worker_host_private_ip
  CHECK (
    worker_host IS NULL OR
    worker_host ~ '^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.0\.0\.1|localhost)$'
  ) NOT VALID;

ALTER TABLE sandbox_leases
  ADD CONSTRAINT chk_sandbox_leases_worker_host_private_ip
  CHECK (
    worker_host ~ '^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.0\.0\.1|localhost)$'
  ) NOT VALID;

ALTER TABLE worker_capacity_snapshots
  ADD CONSTRAINT chk_worker_capacity_worker_host_private_ip
  CHECK (
    worker_host ~ '^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.0\.0\.1|localhost)$'
  ) NOT VALID;
