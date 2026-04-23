import type {
  VectorStore,
  GraphStore,
  EmbeddingProvider,
  RetrievalBoundary,
  RetrievalQuery,
  RetrievalResult,
} from './interfaces.js';

// ============================================================
// HybridRetriever — production-ready hybrid retrieval with RRF
// ============================================================

export interface HybridRetrieverOptions {
  /** Weight applied to vector (semantic) results during RRF (0–1). Default 0.6. */
  vectorWeight?: number;
  /** Weight applied to graph (structural) results during RRF (0–1). Default 0.4. */
  graphWeight?: number;
  /** Default topK when the caller does not specify one. */
  defaultTopK?: number;
  /** RRF constant (k). Higher values reduce the influence of high ranks. Default 60. */
  rrfK?: number;
  /** Score penalty multiplier for vector results that fail graph verification (0–1). Default 0.3. */
  unverifiedPenalty?: number;
  /** Whether to enable graph-verification filtering of vector results. Default true. */
  graphVerification?: boolean;
}

const DEFAULT_OPTIONS: Required<HybridRetrieverOptions> = {
  vectorWeight: 0.6,
  graphWeight: 0.4,
  defaultTopK: 10,
  rrfK: 60,
  unverifiedPenalty: 0.3,
  graphVerification: true,
};

/**
 * HybridRetriever orchestrates parallel semantic (RAG) and structural
 * graph (GitNexus) lookups, fuses results using Reciprocal Rank Fusion (RRF),
 * and optionally verifies vector results against graph ground truth.
 *
 * Both stores are optional — the retriever gracefully degrades when
 * only one source is available or when a store fails at runtime.
 */
export class HybridRetriever implements RetrievalBoundary {
  private readonly vectorStore: VectorStore | undefined;
  private readonly graphStore: GraphStore | undefined;
  private readonly embeddingProvider: EmbeddingProvider | undefined;
  private readonly opts: Required<HybridRetrieverOptions>;

  constructor(
    stores: { vector?: VectorStore; graph?: GraphStore },
    options?: HybridRetrieverOptions,
    embeddingProvider?: EmbeddingProvider,
  ) {
    if (!stores.vector && !stores.graph) {
      throw new Error('HybridRetriever requires at least one store (vector or graph).');
    }
    this.vectorStore = stores.vector;
    this.graphStore = stores.graph;
    this.embeddingProvider = embeddingProvider;
    this.opts = { ...DEFAULT_OPTIONS, ...options };
  }

  async retrieve(query: RetrievalQuery): Promise<readonly RetrievalResult[]> {
    const topK = query.topK ?? this.opts.defaultTopK;

    const resolvedQuery = await this.resolveEmbedding(query);

    const [vectorResults, graphResults] = await Promise.all([
      this.searchVector(resolvedQuery, topK),
      this.searchGraph(resolvedQuery, topK),
    ]);

    const verified = this.opts.graphVerification && this.graphStore
      ? this.applyGraphVerification(vectorResults, graphResults)
      : vectorResults;

    return this.rrfFuse(verified, graphResults, topK);
  }

  // ----------------------------------------------------------
  // Auto-embedding
  // ----------------------------------------------------------

  private async resolveEmbedding(query: RetrievalQuery): Promise<RetrievalQuery> {
    if (query.vector || !this.embeddingProvider || !this.vectorStore) {
      return query;
    }

    try {
      const vector = await this.embeddingProvider.embed(query.text);
      return { ...query, vector };
    } catch {
      // Degrade gracefully — proceed without vector search
      return query;
    }
  }

  // ----------------------------------------------------------
  // Store searches with graceful degradation
  // ----------------------------------------------------------

  private async searchVector(
    query: RetrievalQuery,
    topK: number,
  ): Promise<readonly RetrievalResult[]> {
    if (!this.vectorStore || !query.vector) return [];

    try {
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
    } catch {
      // Graceful degradation: vector store failure is non-fatal
      return [];
    }
  }

  private async searchGraph(
    query: RetrievalQuery,
    topK: number,
  ): Promise<readonly RetrievalResult[]> {
    if (!this.graphStore) return [];

    try {
      const result = await this.graphStore.query(query.text, query.filter);

      return result.nodes.slice(0, topK).map((node, idx, arr) => ({
        id: node.id,
        content: JSON.stringify(node.properties),
        score: arr.length > 1 ? 1 - idx / arr.length : 1,
        source: 'graph' as const,
        metadata: { label: node.label, ...node.properties },
      }));
    } catch {
      // Graceful degradation: graph store failure is non-fatal
      return [];
    }
  }

  // ----------------------------------------------------------
  // Graph-verification filtering
  // ----------------------------------------------------------

  /**
   * Verify vector results against graph ground truth.
   * Results whose IDs appear in graph results are marked verified.
   * Unverified results have their scores penalised.
   */
  private applyGraphVerification(
    vectorResults: readonly RetrievalResult[],
    graphResults: readonly RetrievalResult[],
  ): readonly RetrievalResult[] {
    if (graphResults.length === 0) {
      // No graph data — mark all as unverified but don't penalise
      return vectorResults.map((r) => ({ ...r, graphVerified: false }));
    }

    const graphIds = new Set(graphResults.map((r) => r.id));

    return vectorResults.map((r) => {
      const verified = graphIds.has(r.id);
      return {
        ...r,
        graphVerified: verified,
        score: verified ? r.score : r.score * this.opts.unverifiedPenalty,
      };
    });
  }

  // ----------------------------------------------------------
  // Reciprocal Rank Fusion (RRF)
  // ----------------------------------------------------------

  /**
   * Reciprocal Rank Fusion: for each result in each ranked list,
   * compute `weight / (k + rank)` and sum across lists for shared IDs.
   * This produces a robust merged ranking that handles score
   * distribution differences between heterogeneous retrieval sources.
   */
  private rrfFuse(
    vectorResults: readonly RetrievalResult[],
    graphResults: readonly RetrievalResult[],
    topK: number,
  ): readonly RetrievalResult[] {
    const k = this.opts.rrfK;
    const fused = new Map<string, { result: RetrievalResult; rrfScore: number }>();

    // Score vector results by rank
    for (let rank = 0; rank < vectorResults.length; rank++) {
      const r = vectorResults[rank]!;
      const rrfScore = this.opts.vectorWeight / (k + rank + 1);
      const existing = fused.get(r.id);
      if (existing) {
        existing.rrfScore += rrfScore;
        // Preserve graph-verified metadata from vector result
        if (r.graphVerified) {
          existing.result = { ...existing.result, graphVerified: true };
        }
      } else {
        fused.set(r.id, { result: r, rrfScore });
      }
    }

    // Score graph results by rank
    for (let rank = 0; rank < graphResults.length; rank++) {
      const r = graphResults[rank]!;
      const rrfScore = this.opts.graphWeight / (k + rank + 1);
      const existing = fused.get(r.id);
      if (existing) {
        existing.rrfScore += rrfScore;
        existing.result = { ...existing.result, graphVerified: true };
      } else {
        fused.set(r.id, { result: r, rrfScore });
      }
    }

    // Normalise RRF scores to 0–1 range
    const entries = [...fused.values()];
    const maxScore = entries.reduce((max, e) => Math.max(max, e.rrfScore), 0);

    return entries
      .map((e) => ({
        ...e.result,
        score: maxScore > 0 ? e.rrfScore / maxScore : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
