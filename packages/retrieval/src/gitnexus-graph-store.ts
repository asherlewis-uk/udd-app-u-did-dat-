import type {
  GraphStore,
  GraphQueryResult,
  GraphNode,
  GraphEdge,
} from './interfaces.js';

// ============================================================
// GitNexusGraphStore — REST-backed GraphStore via GitNexus API
// ============================================================

export interface GitNexusStoreOptions {
  /** The base URL of the GitNexus server (e.g. 'http://localhost:4747'). */
  baseUrl?: string;
  /** Optional authentication header if required. */
  apiKey?: string;
}

/**
 * GitNexusGraphStore communicates with a GitNexus server via HTTP.
 * It implements the store-agnostic {@link GraphStore} interface.
 */
export class GitNexusGraphStore implements GraphStore {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;

  constructor(options: GitNexusStoreOptions = {}) {
    this.baseUrl = options.baseUrl?.replace(/\/$/, '') || 'http://localhost:4747';
    this.apiKey = options.apiKey;
  }

  // ----------------------------------------------------------
  // GraphStore implementation
  // ----------------------------------------------------------

  async query(
    queryText: string,
    params?: Record<string, unknown>,
  ): Promise<GraphQueryResult> {
    const cypher = this.applyParams(queryText, params || {});
    const data: any = await this.post('/api/query', { cypher });
    return this.parseResponse(data.result || []);
  }

  async traverse(
    nodeId: string,
    depth: number,
  ): Promise<GraphQueryResult> {
    // Cypher traversal that finds all nodes within 'depth' hops and all relationships between them.
    const cypher = `
      MATCH (p {id: $nodeId})-[*0..${depth}]-(n)
      WITH collect(DISTINCT n) AS nodes
      UNWIND nodes AS n
      OPTIONAL MATCH (n)-[r]->(m) WHERE m IN nodes
      RETURN n, r, n.id AS sourceId, m.id AS targetId
    `.trim();

    const data: any = await this.post('/api/query', { 
        cypher: this.applyParams(cypher, { nodeId }) 
    });
    
    return this.parseResponse(data.result || []);
  }

  /** No-op for HTTP store to maintain interface compatibility if needed. */
  close(): void {}

  // ----------------------------------------------------------
  // HTTP / API helpers
  // ----------------------------------------------------------

  private async post(path: string, body: unknown) {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitNexus API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Naive parameter substitution for Cypher. 
   * (Real implementations should use a driver with proper parameter binding support).
   */
  private applyParams(cypher: string, params: Record<string, unknown>): string {
    let result = cypher;
    for (const [key, value] of Object.entries(params)) {
      const escapedValue = typeof value === 'string' 
        ? `"${value.replace(/"/g, '\\"')}"` 
        : JSON.stringify(value);
      
      const pattern = new RegExp(`\\$${key}\\b`, 'g');
      result = result.replace(pattern, escapedValue);
    }
    return result;
  }

  private parseResponse(rows: any[]): GraphQueryResult {
    const nodesMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    for (const row of rows) {
      // Process Node 'n'
      if (row.n && row.n.id) {
        if (!nodesMap.has(row.n.id)) {
          nodesMap.set(row.n.id, this.mapNode(row.n));
        }
      }

      // Process Relationship 'r'
      if (row.r && row.sourceId && row.targetId) {
        edges.push({
          sourceId: row.sourceId,
          targetId: row.targetId,
          relationship: row.r.type || '',
          properties: { ...row.r },
        });
      }
    }

    return {
      nodes: Array.from(nodesMap.values()),
      edges,
    };
  }

  private mapNode(raw: any): GraphNode {
    const { id, _label, ...properties } = raw;
    return {
      id: String(id || ''),
      label: String(_label || ''),
      properties: properties || {},
    };
  }
}
