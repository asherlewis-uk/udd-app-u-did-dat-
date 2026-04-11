-- Migration: 002_ai_orchestration
-- AI Orchestration tables: provider configs, agent roles, pipelines, pipeline runs

-- ============================================================
-- Provider Configurations
-- Credentials are NEVER stored here — only external secret manager refs
-- ============================================================

CREATE TYPE provider_type AS ENUM (
  'anthropic', 'openai', 'google', 'openai_compatible', 'self_hosted'
);

CREATE TYPE auth_scheme AS ENUM (
  'api_key_header', 'bearer_token', 'custom_header'
);

CREATE TYPE model_catalog_mode AS ENUM (
  'manual', 'discovered_later'
);

CREATE TABLE provider_configs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id                UUID NOT NULL REFERENCES workspaces(id),
  created_by_user_id          UUID NOT NULL REFERENCES users(id),
  name                        VARCHAR(255) NOT NULL,
  provider_type               provider_type NOT NULL,
  endpoint_url                TEXT NOT NULL,
  model_catalog_mode          model_catalog_mode NOT NULL DEFAULT 'manual',
  auth_scheme                 auth_scheme NOT NULL,
  -- External secret manager reference — NEVER the plaintext credential
  credential_secret_ref       TEXT NOT NULL,
  -- Encrypted ref for custom headers — NEVER plaintext
  custom_headers_encrypted_ref TEXT,
  is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
  is_system_managed           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                  TIMESTAMPTZ,
  UNIQUE (workspace_id, name) WHERE deleted_at IS NULL
);

CREATE INDEX idx_provider_configs_workspace_id ON provider_configs (workspace_id, created_at DESC);
CREATE INDEX idx_provider_configs_workspace_type_active
  ON provider_configs (workspace_id, provider_type, is_active)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_provider_configs_workspace_name_active
  ON provider_configs (workspace_id, name, is_active)
  WHERE deleted_at IS NULL;

-- ============================================================
-- Agent Roles
-- ============================================================

CREATE TABLE agent_roles (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id             UUID NOT NULL REFERENCES workspaces(id),
  created_by_user_id       UUID NOT NULL REFERENCES users(id),
  name                     VARCHAR(255) NOT NULL,
  description              TEXT,
  provider_config_id       UUID NOT NULL REFERENCES provider_configs(id),
  model_identifier         VARCHAR(255) NOT NULL,
  endpoint_override_url    TEXT,
  -- Object storage reference for system instructions
  system_instructions_ref  TEXT,
  role_config_json         JSONB NOT NULL DEFAULT '{}',
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, name)
);

CREATE INDEX idx_agent_roles_workspace_id ON agent_roles (workspace_id, created_at DESC);
CREATE INDEX idx_agent_roles_workspace_name_active
  ON agent_roles (workspace_id, name, is_active);
CREATE INDEX idx_agent_roles_provider_config_id ON agent_roles (provider_config_id);

-- ============================================================
-- Pipeline Definitions
-- ============================================================

CREATE TABLE pipeline_definitions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id            UUID NOT NULL REFERENCES workspaces(id),
  project_id              UUID REFERENCES projects(id),
  created_by_user_id      UUID NOT NULL REFERENCES users(id),
  name                    VARCHAR(255) NOT NULL,
  description             TEXT,
  pipeline_version        INTEGER NOT NULL DEFAULT 1,
  pipeline_definition_json JSONB NOT NULL,
  input_schema_json       JSONB,
  output_schema_json      JSONB,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, name) WHERE is_active = TRUE
);

CREATE INDEX idx_pipelines_workspace_id ON pipeline_definitions (workspace_id, created_at DESC);
CREATE INDEX idx_pipelines_project_id ON pipeline_definitions (project_id) WHERE project_id IS NOT NULL;

-- ============================================================
-- Pipeline Run Records (partition-ready)
-- ============================================================

CREATE TYPE pipeline_run_status AS ENUM (
  'queued', 'preparing', 'running', 'succeeded', 'failed', 'canceled'
);

CREATE TYPE pipeline_run_source_type AS ENUM (
  'manual', 'api', 'system'
);

CREATE TABLE pipeline_runs (
  id                    UUID NOT NULL DEFAULT gen_random_uuid(),
  workspace_id          UUID NOT NULL,
  project_id            UUID,
  pipeline_id           UUID NOT NULL REFERENCES pipeline_definitions(id),
  triggered_by_user_id  UUID NOT NULL REFERENCES users(id),
  source_type           pipeline_run_source_type NOT NULL DEFAULT 'manual',
  status                pipeline_run_status NOT NULL DEFAULT 'queued',
  -- Object storage references — not inline payloads
  input_payload_ref     TEXT,
  output_payload_ref    TEXT,
  error_summary         TEXT,
  idempotency_key       VARCHAR(512),
  started_at            TIMESTAMPTZ,
  finished_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE pipeline_runs_default PARTITION OF pipeline_runs DEFAULT;

CREATE INDEX idx_pipeline_runs_workspace_id_created_at
  ON pipeline_runs (workspace_id, created_at DESC);
CREATE INDEX idx_pipeline_runs_pipeline_id_created_at
  ON pipeline_runs (workspace_id, pipeline_id, created_at DESC);
CREATE INDEX idx_pipeline_runs_status_created_at
  ON pipeline_runs (workspace_id, status, created_at DESC);
CREATE UNIQUE INDEX idx_pipeline_runs_idempotency_key
  ON pipeline_runs (pipeline_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================================
-- Model Invocation Logs (append-only — no secret values)
-- ============================================================

CREATE TABLE model_invocation_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL,
  pipeline_run_id   UUID,
  pipeline_id       UUID,
  agent_role_id     UUID NOT NULL,
  provider_config_id UUID NOT NULL,
  model_identifier  VARCHAR(255) NOT NULL,
  status            VARCHAR(50) NOT NULL,
  error_code        VARCHAR(100),
  raw_response_ref  TEXT, -- object storage reference
  latency_ms        INTEGER,
  correlation_id    VARCHAR(255),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invocation_logs_workspace_id ON model_invocation_logs (workspace_id, created_at DESC);
CREATE INDEX idx_invocation_logs_pipeline_run_id ON model_invocation_logs (pipeline_run_id)
  WHERE pipeline_run_id IS NOT NULL;
CREATE INDEX idx_invocation_logs_provider_config_id
  ON model_invocation_logs (provider_config_id, created_at DESC);
