-- Migration 006: Project-First Public Surface
BEGIN;

-- add nullable project_id to agent_roles with FK to projects(id)
ALTER TABLE agent_roles ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX idx_agent_roles_project_id ON agent_roles(project_id);

-- replace UNIQUE (workspace_id, name) on agent_roles with two partial uniqueness rules
ALTER TABLE agent_roles DROP CONSTRAINT uiq_agent_roles_workspace_id_name;
CREATE UNIQUE INDEX idx_agent_roles_unique_workspace ON agent_roles (workspace_id, name) WHERE project_id IS NULL;
CREATE UNIQUE INDEX idx_agent_roles_unique_project ON agent_roles (project_id, name) WHERE project_id IS NOT NULL;

-- replace active pipeline uniqueness with two partial uniqueness rules
ALTER TABLE pipelines DROP CONSTRAINT uiq_pipelines_workspace_id_active_name;
CREATE UNIQUE INDEX idx_pipelines_unique_active_workspace ON pipelines (workspace_id, name) WHERE project_id IS NULL AND is_active = TRUE;
CREATE UNIQUE INDEX idx_pipelines_unique_active_project ON pipelines (project_id, name) WHERE project_id IS NOT NULL AND is_active = TRUE;

COMMIT;
