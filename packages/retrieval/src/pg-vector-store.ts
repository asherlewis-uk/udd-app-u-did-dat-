import type { Pool } from 'pg';
import type {
  VectorStore,
  EmbeddingChunk,
  VectorSearchResult,
  VectorSearchOptions,
} from './interfaces.js';

/**
 * PostgresVectorStore — pgvector-backed implementation of VectorStore.
 *
 * Uses the `project_embeddings` table created by migration 007.
 * Accepts an existing `pg.Pool` so callers can share the @udd/database pool.
 */
export class PostgresVectorStore implements VectorStore {
  constructor(private readonly pool: Pool) {}

  async upsert(chunks: readonly EmbeddingChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const chunk of chunks) {
        const vectorLiteral = pgVector(chunk.vector);
        await client.query(
          `INSERT INTO project_embeddings (id, project_id, content, embedding, metadata)
           VALUES ($1, $2, $3, $4::vector, $5)
           ON CONFLICT (id) DO UPDATE
             SET content   = EXCLUDED.content,
                 embedding = EXCLUDED.embedding,
                 metadata  = EXCLUDED.metadata`,
          [
            chunk.id,
            (chunk.metadata as Record<string, unknown>).projectId ?? null,
            chunk.content,
            vectorLiteral,
            JSON.stringify(chunk.metadata),
          ],
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async search(
    query: readonly number[],
    opts: VectorSearchOptions,
  ): Promise<readonly VectorSearchResult[]> {
    const vectorLiteral = pgVector(query);
    const threshold = opts.scoreThreshold ?? 0;

    interface EmbeddingRow {
      id: string;
      content: string;
      embedding: string;
      metadata: Record<string, unknown>;
      score: number;
    }

    // 1 - cosine_distance = cosine_similarity
    const { rows } = await this.pool.query<EmbeddingRow>(
      `SELECT id, content, embedding, metadata,
              1 - (embedding <=> $1::vector) AS score
         FROM project_embeddings
        WHERE 1 - (embedding <=> $1::vector) >= $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3`,
      [vectorLiteral, threshold, opts.topK],
    );

    return rows.map((r: EmbeddingRow) => ({
      chunk: {
        id: r.id,
        content: r.content,
        vector: parseVector(r.embedding),
        metadata: r.metadata,
      },
      score: r.score,
    }));
  }

  async delete(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.pool.query(
      `DELETE FROM project_embeddings WHERE id = ANY($1::uuid[])`,
      [ids],
    );
  }
}

/** Format a number[] as a pgvector literal, e.g. '[0.1,0.2,0.3]'. */
function pgVector(v: readonly number[]): string {
  return `[${v.join(',')}]`;
}

/** Parse a pgvector text representation back to number[]. */
function parseVector(text: string): number[] {
  return text
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map(Number);
}
