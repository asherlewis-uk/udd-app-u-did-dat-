// ============================================================
// Retrieval Boundary — store-agnostic interfaces
// ============================================================

/** A single embedding vector paired with the text it was derived from. */
export interface EmbeddingChunk {
  id: string;
  content: string;
  vector: readonly number[];
  metadata: Record<string, unknown>;
}

/** Scored result returned from a vector similarity search. */
export interface VectorSearchResult {
  chunk: EmbeddingChunk;
  /** Cosine-similarity or equivalent score (higher = more relevant). */
  score: number;
}

/**
 * VectorStore — semantic (RAG) storage boundary.
 *
 * Implementations wrap a concrete vector database (Qdrant, Pinecone,
 * pgvector, etc.) but consumers only depend on this interface.
 */
export interface VectorStore {
  /** Persist one or more embedding chunks. */
  upsert(chunks: readonly EmbeddingChunk[]): Promise<void>;

  /** Semantic similarity search against the stored vectors. */
  search(query: readonly number[], opts: VectorSearchOptions): Promise<readonly VectorSearchResult[]>;

  /** Remove chunks by their ids. */
  delete(ids: readonly string[]): Promise<void>;
}

export interface VectorSearchOptions {
  /** Maximum number of results to return. */
  topK: number;
  /** Minimum similarity score threshold (0–1). */
  scoreThreshold?: number;
  /** Optional metadata filter applied before scoring. */
  filter?: Record<string, unknown> | undefined;
}

// ============================================================
// Graph Store — structural relationship boundary
// ============================================================

/** A single node in the knowledge graph. */
export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, unknown>;
}

/** A directed edge between two graph nodes. */
export interface GraphEdge {
  sourceId: string;
  targetId: string;
  relationship: string;
  properties: Record<string, unknown>;
}

/** Result set from a graph traversal or Cypher-style query. */
export interface GraphQueryResult {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
}

/**
 * GraphStore — structural/relational knowledge boundary.
 *
 * Implementations wrap a graph database or GitNexus, but consumers
 * only depend on this interface.
 */
export interface GraphStore {
  /** Execute a structured graph query (Cypher, Gremlin, etc.). */
  query(queryText: string, params?: Record<string, unknown>): Promise<GraphQueryResult>;

  /** Traverse outward from a node up to `depth` hops. */
  traverse(nodeId: string, depth: number): Promise<GraphQueryResult>;
}

// ============================================================
// Embedding Provider — automated embedding boundary
// ============================================================

/**
 * EmbeddingProvider — generates embedding vectors from text.
 *
 * Implementations wrap a concrete embedding API (OpenAI, Cohere, etc.)
 * but consumers only depend on this interface.
 */
export interface EmbeddingProvider {
  /** Generate an embedding vector for a single text input. */
  embed(text: string): Promise<readonly number[]>;

  /** The model identifier used for embedding (e.g. 'text-embedding-3-small'). */
  readonly model: string;

  /** Dimensionality of the output vectors. */
  readonly dimensions: number;
}

// ============================================================
// Retrieval Boundary — unified retrieval contract
// ============================================================

/** A single retrieval result that may originate from any store. */
export interface RetrievalResult {
  id: string;
  content: string;
  /** Normalised relevance score (0–1, higher = more relevant). */
  score: number;
  source: 'vector' | 'graph';
  metadata: Record<string, unknown>;
  /** Whether this result was verified against graph ground truth. */
  graphVerified?: boolean | undefined;
}

export interface RetrievalQuery {
  /** Natural-language query text. */
  text: string;
  /** Pre-computed embedding vector (when the caller owns embedding). */
  vector?: readonly number[];
  /** Maximum results to return across all stores. */
  topK?: number;
  /** Optional metadata/graph filter. */
  filter?: Record<string, unknown>;
}

/**
 * RetrievalBoundary — the single entry-point that pipeline steps
 * and agent roles call to retrieve context.
 *
 * Implementations decide how to fan-out across vector and graph
 * stores, merge, re-rank, and deduplicate results.
 */
export interface RetrievalBoundary {
  retrieve(query: RetrievalQuery): Promise<readonly RetrievalResult[]>;
}
