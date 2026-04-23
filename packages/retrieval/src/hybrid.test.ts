import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HybridRetriever } from './hybrid.js';
import type {
  VectorStore,
  GraphStore,
  EmbeddingProvider,
  VectorSearchResult,
  GraphQueryResult,
  RetrievalQuery,
} from './interfaces.js';

// ============================================================
// Mock factories
// ============================================================

function mockVectorStore(results: readonly VectorSearchResult[] = []): VectorStore {
  return {
    upsert: vi.fn(),
    search: vi.fn().mockResolvedValue(results),
    delete: vi.fn(),
  };
}

function mockGraphStore(result?: GraphQueryResult): GraphStore {
  const defaultResult: GraphQueryResult = { nodes: [], edges: [] };
  return {
    query: vi.fn().mockResolvedValue(result ?? defaultResult),
    traverse: vi.fn().mockResolvedValue(result ?? defaultResult),
  };
}

function mockEmbeddingProvider(vector: readonly number[] = [0.1, 0.2, 0.3]): EmbeddingProvider {
  return {
    embed: vi.fn().mockResolvedValue(vector),
    model: 'text-embedding-3-small',
    dimensions: vector.length,
  };
}

function vectorHit(id: string, content: string, score: number): VectorSearchResult {
  return {
    chunk: { id, content, vector: [0.1], metadata: {} },
    score,
  };
}

function graphResult(
  nodes: Array<{ id: string; label: string; properties?: Record<string, unknown> }>,
): GraphQueryResult {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.label,
      properties: n.properties ?? {},
    })),
    edges: [],
  };
}

// ============================================================
// Tests
// ============================================================

describe('HybridRetriever', () => {
  describe('construction', () => {
    it('requires at least one store', () => {
      expect(() => new HybridRetriever({})).toThrow(
        'HybridRetriever requires at least one store',
      );
    });

    it('accepts vector-only', () => {
      const retriever = new HybridRetriever({ vector: mockVectorStore() });
      expect(retriever).toBeDefined();
    });

    it('accepts graph-only', () => {
      const retriever = new HybridRetriever({ graph: mockGraphStore() });
      expect(retriever).toBeDefined();
    });

    it('accepts both stores', () => {
      const retriever = new HybridRetriever({
        vector: mockVectorStore(),
        graph: mockGraphStore(),
      });
      expect(retriever).toBeDefined();
    });
  });

  describe('graceful degradation', () => {
    it('returns graph results when vector store is absent', async () => {
      const graph = mockGraphStore(
        graphResult([{ id: 'g1', label: 'Function' }]),
      );
      const retriever = new HybridRetriever({ graph });

      const results = await retriever.retrieve({ text: 'test query' });

      expect(results).toHaveLength(1);
      expect(results[0]!.source).toBe('graph');
    });

    it('returns vector results when graph store is absent', async () => {
      const vector = mockVectorStore([vectorHit('v1', 'hello', 0.9)]);
      const retriever = new HybridRetriever({ vector });

      const results = await retriever.retrieve({
        text: 'test',
        vector: [0.1, 0.2],
      });

      expect(results).toHaveLength(1);
      expect(results[0]!.source).toBe('vector');
    });

    it('returns empty when vector store throws', async () => {
      const vector = mockVectorStore();
      (vector.search as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('connection failed'),
      );
      const retriever = new HybridRetriever({ vector });

      const results = await retriever.retrieve({
        text: 'test',
        vector: [0.1],
      });

      expect(results).toHaveLength(0);
    });

    it('returns empty when graph store throws', async () => {
      const graph = mockGraphStore();
      (graph.query as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('graph unavailable'),
      );
      const retriever = new HybridRetriever({ graph });

      const results = await retriever.retrieve({ text: 'test' });

      expect(results).toHaveLength(0);
    });

    it('falls back to graph when vector store throws at runtime', async () => {
      const vector = mockVectorStore();
      (vector.search as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('timeout'),
      );
      const graph = mockGraphStore(
        graphResult([{ id: 'g1', label: 'Class' }]),
      );
      const retriever = new HybridRetriever({ vector, graph });

      const results = await retriever.retrieve({
        text: 'test',
        vector: [0.1],
      });

      expect(results).toHaveLength(1);
      expect(results[0]!.source).toBe('graph');
    });

    it('falls back to vector when graph store throws at runtime', async () => {
      const vector = mockVectorStore([vectorHit('v1', 'content', 0.85)]);
      const graph = mockGraphStore();
      (graph.query as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('graph error'),
      );
      const retriever = new HybridRetriever({ vector, graph });

      const results = await retriever.retrieve({
        text: 'test',
        vector: [0.1],
      });

      expect(results).toHaveLength(1);
      expect(results[0]!.source).toBe('vector');
    });
  });

  describe('auto-embedding', () => {
    it('auto-embeds text query when embedding provider is present', async () => {
      const embedVector = [0.5, 0.6, 0.7];
      const embedding = mockEmbeddingProvider(embedVector);
      const vector = mockVectorStore([vectorHit('v1', 'result', 0.9)]);
      const retriever = new HybridRetriever({ vector }, undefined, embedding);

      await retriever.retrieve({ text: 'what is auth?' });

      expect(embedding.embed).toHaveBeenCalledWith('what is auth?');
      expect(vector.search).toHaveBeenCalledWith(
        embedVector,
        expect.objectContaining({ topK: 10 }),
      );
    });

    it('uses pre-computed vector over auto-embedding', async () => {
      const precomputed = [0.9, 0.8];
      const embedding = mockEmbeddingProvider();
      const vector = mockVectorStore([vectorHit('v1', 'result', 0.9)]);
      const retriever = new HybridRetriever({ vector }, undefined, embedding);

      await retriever.retrieve({ text: 'test', vector: precomputed });

      expect(embedding.embed).not.toHaveBeenCalled();
      expect(vector.search).toHaveBeenCalledWith(
        precomputed,
        expect.objectContaining({ topK: 10 }),
      );
    });

    it('degrades gracefully when embedding provider fails', async () => {
      const embedding = mockEmbeddingProvider();
      (embedding.embed as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('API quota exceeded'),
      );
      const vector = mockVectorStore([vectorHit('v1', 'data', 0.8)]);
      const graph = mockGraphStore(
        graphResult([{ id: 'g1', label: 'Module' }]),
      );
      const retriever = new HybridRetriever({ vector, graph }, undefined, embedding);

      const results = await retriever.retrieve({ text: 'test query' });

      // Embedding failed, so no vector search, but graph still works
      expect(vector.search).not.toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0]!.source).toBe('graph');
    });
  });

  describe('RRF fusion', () => {
    it('fuses results from both stores', async () => {
      const vector = mockVectorStore([
        vectorHit('v1', 'semantic result', 0.95),
        vectorHit('v2', 'another result', 0.80),
      ]);
      const graph = mockGraphStore(
        graphResult([
          { id: 'g1', label: 'Function' },
          { id: 'g2', label: 'Class' },
        ]),
      );
      const retriever = new HybridRetriever({ vector, graph });

      const results = await retriever.retrieve({
        text: 'test',
        vector: [0.1],
      });

      expect(results.length).toBe(4);
      // All scores normalised to 0–1
      for (const r of results) {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
      }
    });

    it('boosts shared IDs that appear in both sources', async () => {
      const sharedId = 'shared-1';
      const vector = mockVectorStore([
        vectorHit(sharedId, 'semantic hit', 0.9),
        vectorHit('v-only', 'vector only', 0.85),
      ]);
      const graph = mockGraphStore(
        graphResult([
          { id: sharedId, label: 'Function' },
          { id: 'g-only', label: 'Class' },
        ]),
      );
      const retriever = new HybridRetriever(
        { vector, graph },
        { graphVerification: false },
      );

      const results = await retriever.retrieve({
        text: 'test',
        vector: [0.1],
      });

      const shared = results.find((r) => r.id === sharedId);
      expect(shared).toBeDefined();
      // Shared result should have highest score (1.0 after normalisation)
      expect(shared!.score).toBe(1);
    });

    it('respects topK limit', async () => {
      const vector = mockVectorStore([
        vectorHit('v1', 'a', 0.9),
        vectorHit('v2', 'b', 0.8),
        vectorHit('v3', 'c', 0.7),
      ]);
      const graph = mockGraphStore(
        graphResult([
          { id: 'g1', label: 'A' },
          { id: 'g2', label: 'B' },
          { id: 'g3', label: 'C' },
        ]),
      );
      const retriever = new HybridRetriever({ vector, graph });

      const results = await retriever.retrieve({
        text: 'test',
        vector: [0.1],
        topK: 3,
      });

      expect(results).toHaveLength(3);
    });

    it('uses default topK of 10', async () => {
      const vector = mockVectorStore([vectorHit('v1', 'a', 0.9)]);
      const retriever = new HybridRetriever({ vector });

      await retriever.retrieve({ text: 'test', vector: [0.1] });

      expect(vector.search).toHaveBeenCalledWith(
        [0.1],
        expect.objectContaining({ topK: 10 }),
      );
    });

    it('produces descending score order', async () => {
      const vector = mockVectorStore([
        vectorHit('v1', 'low', 0.3),
        vectorHit('v2', 'high', 0.99),
      ]);
      const graph = mockGraphStore(
        graphResult([{ id: 'g1', label: 'Mid' }]),
      );
      const retriever = new HybridRetriever(
        { vector, graph },
        { graphVerification: false },
      );

      const results = await retriever.retrieve({
        text: 'test',
        vector: [0.1],
      });

      for (let i = 1; i < results.length; i++) {
        expect(results[i]!.score).toBeLessThanOrEqual(results[i - 1]!.score);
      }
    });
  });

  describe('graph-verification filtering', () => {
    it('marks vector results verified when ID matches graph results', async () => {
      const sharedId = 'shared-id';
      const vector = mockVectorStore([
        vectorHit(sharedId, 'verified content', 0.9),
        vectorHit('unverified', 'other content', 0.85),
      ]);
      const graph = mockGraphStore(
        graphResult([{ id: sharedId, label: 'Function' }]),
      );
      const retriever = new HybridRetriever({ vector, graph });

      const results = await retriever.retrieve({
        text: 'test',
        vector: [0.1],
      });

      const verified = results.find((r) => r.id === sharedId);
      const unverified = results.find((r) => r.id === 'unverified');

      expect(verified).toBeDefined();
      expect(verified!.graphVerified).toBe(true);
      expect(unverified).toBeDefined();
      expect(unverified!.graphVerified).toBe(false);
    });

    it('penalises unverified vector results', async () => {
      const vector = mockVectorStore([
        vectorHit('verified', 'v', 0.9),
        vectorHit('unverified', 'u', 0.9),
      ]);
      const graph = mockGraphStore(
        graphResult([{ id: 'verified', label: 'Fn' }]),
      );
      const retriever = new HybridRetriever({ vector, graph });

      const results = await retriever.retrieve({
        text: 'test',
        vector: [0.1],
      });

      const verifiedResult = results.find((r) => r.id === 'verified');
      const unverifiedResult = results.find((r) => r.id === 'unverified');

      // Verified result should rank higher
      expect(verifiedResult!.score).toBeGreaterThan(unverifiedResult!.score);
    });

    it('does not penalise when graph verification is disabled', async () => {
      const vector = mockVectorStore([
        vectorHit('v1', 'content', 0.9),
      ]);
      const graph = mockGraphStore(
        graphResult([{ id: 'different', label: 'X' }]),
      );
      const retriever = new HybridRetriever(
        { vector, graph },
        { graphVerification: false },
      );

      const results = await retriever.retrieve({
        text: 'test',
        vector: [0.1],
      });

      const v1 = results.find((r) => r.id === 'v1');
      expect(v1).toBeDefined();
      // No graphVerified property when verification is disabled
      expect(v1!.graphVerified).toBeUndefined();
    });

    it('does not penalise when graph returns no results', async () => {
      const vector = mockVectorStore([vectorHit('v1', 'data', 0.9)]);
      const graph = mockGraphStore(graphResult([]));
      const retriever = new HybridRetriever({ vector, graph });

      const results = await retriever.retrieve({
        text: 'test',
        vector: [0.1],
      });

      expect(results).toHaveLength(1);
      // When graph returns nothing, results are marked unverified but not penalised
      expect(results[0]!.graphVerified).toBe(false);
    });
  });

  describe('custom options', () => {
    it('accepts custom weights and RRF constant', async () => {
      const vector = mockVectorStore([vectorHit('v1', 'a', 0.9)]);
      const graph = mockGraphStore(
        graphResult([{ id: 'g1', label: 'B' }]),
      );
      const retriever = new HybridRetriever(
        { vector, graph },
        {
          vectorWeight: 0.8,
          graphWeight: 0.2,
          rrfK: 30,
          defaultTopK: 5,
          unverifiedPenalty: 0.5,
        },
      );

      const results = await retriever.retrieve({
        text: 'test',
        vector: [0.1],
      });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('parallel execution', () => {
    it('executes vector and graph searches in parallel', async () => {
      let vectorStarted = false;
      let graphStarted = false;
      let vectorResolve: (() => void) | undefined;
      let graphResolve: (() => void) | undefined;

      const vector = mockVectorStore();
      (vector.search as ReturnType<typeof vi.fn>).mockImplementation(() => {
        vectorStarted = true;
        return new Promise<readonly VectorSearchResult[]>((resolve) => {
          vectorResolve = () => resolve([vectorHit('v1', 'a', 0.9)]);
        });
      });

      const graph = mockGraphStore();
      (graph.query as ReturnType<typeof vi.fn>).mockImplementation(() => {
        graphStarted = true;
        return new Promise<GraphQueryResult>((resolve) => {
          graphResolve = () =>
            resolve(graphResult([{ id: 'g1', label: 'X' }]));
        });
      });

      const retriever = new HybridRetriever({ vector, graph });
      const promise = retriever.retrieve({ text: 'test', vector: [0.1] });

      // Allow microtasks to run
      await new Promise((r) => setTimeout(r, 10));

      // Both should have started before either resolves
      expect(vectorStarted).toBe(true);
      expect(graphStarted).toBe(true);

      vectorResolve!();
      graphResolve!();

      const results = await promise;
      expect(results.length).toBe(2);
    });
  });
});
