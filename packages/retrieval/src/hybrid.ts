import type {
  VectorStore,
  GraphStore,
  RetrievalBoundary,
  RetrievalQuery,
  RetrievalResult,
} from './interfaces.js';

// ============================================================
// HybridRetriever — merges semantic + structural lookups
// ============================================================

export interface HybridRetrieverOptions {
  /** Weight applied to vector (semantic) results during score fusion (0–1). */
  vectorWeight?: number;
  /** Weight applied to graph (structural) results during score fusion (0–1). */
  graphWeight?: number;
  /** Default topK when the caller does not specify one. */
  defaultTopK?: number;
}

const DEFAULT_OPTIONS: Required<HybridRetrieverOptions> = {
  vectorWeight: 0.6,
  graphWeight: 0.4,
  defaultTopK: 10,
};

/**
 * HybridRetriever orchestrates parallel semantic (RAG) and structural
 * graph (GitNexus) lookups, then fuses and re-ranks the results.
 *
 * Both stores are optional — the retriever gracefully degrades when
 * only one source is available.
 */
export class HybridRetriever implements RetrievalBoundary {
  private readonly vectorStore: VectorStore | undefined;
  private readonly graphStore: GraphStore | undefined;
  private readonly opts: Required<HybridRetrieverOptions>;

  constructor(
    stores: { vector?: VectorStore; graph?: GraphStore },
    options?: HybridRetrieverOptions,
  ) {
    if (!stores.vector && !stores.graph) {
      throw new Error('HybridRetriever requires at least one store (vector or graph).');
    }
    this.vectorStore = stores.vector;
    this.graphStore = stores.graph;
    this.opts = { ...DEFAULT_OPTIONS, ...options };
  }

  async retrieve(query: RetrievalQuery): Promise<readonly RetrievalResult[]> {
    const topK = query.topK ?? this.opts.defaultTopK;

    const [vectorResults, graphResults] = await Promise.all([
      this.searchVector(query, topK),
      this.searchGraph(query, topK),
    ]);

    const merged = this.fuseResults(vectorResults, graphResults, topK);
    return merged;
  }

  // ----------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------

  private async searchVector(
    query: RetrievalQuery,
    topK: number,
  ): Promise<readonly RetrievalResult[]> {
    if (!this.vectorStore || !query.vector) return [];

    const hits = await this.vectorStore.search(query.vector, {
      topK,
      filter: query.filter,
    });

    return hits.map((h) => ({
      id: h.chunk.id,
      content: h.chunk.content,
      score: h.score,
      source: 'vector' as const,
      metadata: h.chunk.metadata,
    }));
  }

  private async searchGraph(
    query: RetrievalQuery,
    topK: number,
  ): Promise<readonly RetrievalResult[]> {
    if (!this.graphStore) return [];

    const result = await this.graphStore.query(query.text, query.filter);

    return result.nodes.slice(0, topK).map((node, idx, arr) => ({
      id: node.id,
      content: JSON.stringify(node.properties),
      // Linearly decay score based on result position
      score: arr.length > 1 ? 1 - idx / arr.length : 1,
      source: 'graph' as const,
      metadata: { label: node.label, ...node.properties },
    }));
  }

  /**
   * Reciprocal Rank Fusion (simplified): weight-adjust each source's
   * scores, deduplicate by id, then sort descending.
   */
  private fuseResults(
    vectorResults: readonly RetrievalResult[],
    graphResults: readonly RetrievalResult[],
    topK: number,
  ): readonly RetrievalResult[] {
    const seen = new Map<string, RetrievalResult>();

    for (const r of vectorResults) {
      const weighted = { ...r, score: r.score * this.opts.vectorWeight };
      const existing = seen.get(r.id);
      if (!existing || existing.score < weighted.score) {
        seen.set(r.id, weighted);
      }
    }

    for (const r of graphResults) {
      const weighted = { ...r, score: r.score * this.opts.graphWeight };
      const existing = seen.get(r.id);
      if (!existing || existing.score < weighted.score) {
        seen.set(r.id, weighted);
      }
    }

    return [...seen.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
