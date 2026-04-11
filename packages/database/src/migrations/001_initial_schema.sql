-- Migration: 001_initial_schema
-- Core platform entities: users, orgs, workspaces, projects, sessions, previews, collaboration, audit

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- Users / Identity
-- ============================================================

CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_auth_id VARCHAR(512) UNIQUE NOT NULL,
  email            VARCHAR(512) UNIQUE NOT NULL,
  display_name     VARCHAR(255) NOT NULL,
  avatar_url       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_external_auth_id ON users (external_auth_id);

-- ============================================================
-- Organizations
-- ============================================================

CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Workspaces
-- ============================================================

CREATE TABLE workspaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE (organization_id, slug)
);

CREATE INDEX idx_workspaces_org_id ON workspaces (organization_id);
CREATE INDEX idx_workspaces_slug ON workspaces (slug);

-- ============================================================
-- Memberships + Role Grants (RBAC)
-- ============================================================

CREATE TYPE membership_role AS ENUM (
  'org_owner', 'workspace_admin', 'workspace_member', 'project_editor', 'project_viewer'
);

CREATE TABLE memberships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  role         membership_role NOT NULL DEFAULT 'workspace_member',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, workspace_id)
);

CREATE INDEX idx_memberships_user_id ON memberships (user_id);
CREATE INDEX idx_memberships_workspace_id ON memberships (workspace_id);

CREATE TABLE role_grants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id       UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  permission          VARCHAR(100) NOT NULL,
  granted_by_user_id  UUID NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (membership_id, permission)
);

-- ============================================================
-- Projects
-- ============================================================

CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name         VARCHAR(255) NOT NULL,
  slug         VARCHAR(255) NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  UNIQUE (workspace_id, slug)
);

CREATE INDEX idx_projects_workspace_id_created_at ON projects (workspace_id, created_at DESC);
CREATE INDEX idx_projects_workspace_id_updated_at ON projects (workspace_id, updated_at DESC);

CREATE TABLE project_repos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider       VARCHAR(50) NOT NULL CHECK (provider IN ('github','gitlab','bitbucket')),
  remote_url     TEXT NOT NULL,
  default_branch VARCHAR(255) NOT NULL DEFAULT 'main',
  connected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_environments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  variables    JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, name)
);

-- ============================================================
-- Secret Metadata (no plaintext values stored here)
-- ============================================================

CREATE TABLE secret_metadata (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name         VARCHAR(255) NOT NULL,
  secret_ref   TEXT NOT NULL,         -- external secret manager key
  provider     VARCHAR(100) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at   TIMESTAMPTZ,
  UNIQUE (workspace_id, name)
);

CREATE INDEX idx_secret_metadata_workspace_id ON secret_metadata (workspace_id);

-- ============================================================
-- Sessions
-- ============================================================

CREATE TYPE session_state AS ENUM (
  'creating', 'starting', 'running', 'idle', 'stopping', 'stopped', 'failed'
);

CREATE TABLE sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES projects(id),
  workspace_id          UUID NOT NULL REFERENCES workspaces(id),
  user_id               UUID NOT NULL REFERENCES users(id),
  state                 session_state NOT NULL DEFAULT 'creating',
  worker_host           VARCHAR(255),
  host_port             INTEGER,
  started_at            TIMESTAMPTZ,
  stopped_at            TIMESTAMPTZ,
  last_activity_at      TIMESTAMPTZ,
  idle_timeout_seconds  INTEGER NOT NULL DEFAULT 1800,
  version               INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_workspace_id_created_at ON sessions (workspace_id, created_at DESC);
CREATE INDEX idx_sessions_project_id_updated_at ON sessions (project_id, updated_at DESC);
CREATE INDEX idx_sessions_session_id_state ON sessions (id, state);
CREATE INDEX idx_sessions_state_last_activity ON sessions (state, last_activity_at);
CREATE INDEX idx_sessions_user_id ON sessions (user_id);

-- ============================================================
-- Sandbox Leases
-- ============================================================

CREATE TYPE lease_state AS ENUM (
  'pending', 'active', 'releasing', 'released', 'orphaned'
);

CREATE TABLE sandbox_leases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id),
  worker_host VARCHAR(255) NOT NULL,
  host_port   INTEGER NOT NULL,
  lease_state lease_state NOT NULL DEFAULT 'pending',
  leased_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  version     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (worker_host, host_port, lease_state)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_sandbox_leases_session_id ON sandbox_leases (session_id);
CREATE INDEX idx_sandbox_leases_worker_host_port_state
  ON sandbox_leases (worker_host, host_port, lease_state);
CREATE INDEX idx_sandbox_leases_expires_at ON sandbox_leases (expires_at)
  WHERE lease_state = 'active';

-- ============================================================
-- Preview Route Bindings
-- ============================================================

CREATE TYPE preview_route_state AS ENUM (
  'binding', 'active', 'revoking', 'revoked', 'expired'
);

CREATE TABLE preview_routes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_id   VARCHAR(64) UNIQUE NOT NULL,  -- URL-safe identifier
  session_id   UUID NOT NULL REFERENCES sessions(id),
  project_id   UUID NOT NULL REFERENCES projects(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  worker_host  VARCHAR(255) NOT NULL,
  host_port    INTEGER NOT NULL,
  state        preview_route_state NOT NULL DEFAULT 'binding',
  bound_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  version      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_preview_routes_session_id ON preview_routes (session_id);
CREATE INDEX idx_preview_routes_workspace_id ON preview_routes (workspace_id);
CREATE INDEX idx_preview_routes_state ON preview_routes (state) WHERE state = 'active';

-- ============================================================
-- Worker Capacity Snapshots
-- ============================================================

CREATE TABLE worker_capacity_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_host     VARCHAR(255) NOT NULL,
  total_slots     INTEGER NOT NULL,
  used_slots      INTEGER NOT NULL,
  available_ports INTEGER[] NOT NULL DEFAULT '{}',
  healthy         BOOLEAN NOT NULL DEFAULT TRUE,
  reported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_worker_capacity_worker_host ON worker_capacity_snapshots (worker_host, reported_at DESC);

-- ============================================================
-- Checkpoint Manifests
-- ============================================================

CREATE TABLE checkpoint_manifests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES sessions(id),
  project_id          UUID NOT NULL REFERENCES projects(id),
  snapshot_ref        TEXT NOT NULL,  -- object storage reference
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id  UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_checkpoints_session_id ON checkpoint_manifests (session_id);
CREATE INDEX idx_checkpoints_project_id ON checkpoint_manifests (project_id, created_at DESC);

-- ============================================================
-- Collaboration: Threads + Comments
-- ============================================================

CREATE TABLE collaboration_threads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  session_id UUID REFERENCES sessions(id),
  anchor     JSONB NOT NULL DEFAULT '{"type":"general"}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_threads_project_id ON collaboration_threads (project_id, updated_at DESC);

CREATE TABLE comments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id      UUID NOT NULL REFERENCES collaboration_threads(id),
  author_user_id UUID NOT NULL REFERENCES users(id),
  body           TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX idx_comments_thread_id ON comments (thread_id, created_at ASC);

-- ============================================================
-- Audit Log (partition-ready)
-- ============================================================

CREATE TABLE audit_logs (
  id            UUID NOT NULL DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL,
  actor_user_id UUID NOT NULL,
  action        VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id   UUID NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}', -- MUST NOT contain secrets
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Default partition for data before first explicit partition
CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;

CREATE INDEX idx_audit_logs_workspace_id ON audit_logs (workspace_id, timestamp DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);

-- ============================================================
-- Usage Meter Events (partition-ready)
-- ============================================================

CREATE TABLE usage_meter_events (
  id            UUID NOT NULL DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL,
  event_type    VARCHAR(100) NOT NULL,
  resource_id   UUID NOT NULL,
  quantity      NUMERIC NOT NULL,
  unit          VARCHAR(50) NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

CREATE TABLE usage_meter_events_default PARTITION OF usage_meter_events DEFAULT;

CREATE INDEX idx_usage_workspace_id ON usage_meter_events (workspace_id, recorded_at DESC);
CREATE INDEX idx_usage_event_type ON usage_meter_events (event_type, recorded_at DESC);

-- ============================================================
-- Invitations
-- ============================================================

CREATE TABLE invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id),
  email         VARCHAR(512) NOT NULL,
  role          membership_role NOT NULL DEFAULT 'workspace_member',
  invited_by_id UUID NOT NULL REFERENCES users(id),
  token         VARCHAR(512) UNIQUE NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_email ON invitations (email);
CREATE INDEX idx_invitations_workspace_id ON invitations (workspace_id);
