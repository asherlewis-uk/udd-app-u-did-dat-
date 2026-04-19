-- 007_retrieval_boundary.sql
-- Adds pgvector extension and project_embeddings table for RAG retrieval.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE project_embeddings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  embedding   VECTOR(1536),
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON project_embeddings USING hnsw (embedding vector_cosine_ops);
