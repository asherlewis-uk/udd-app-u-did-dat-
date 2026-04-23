import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { GitNexusGraphStore } from './gitnexus-graph-store.js';

/**
 * These tests verify the GitNexusGraphStore HTTP client.
 */

describe('GitNexusGraphStore', () => {
  it('handles initialization', () => {
    const store = new GitNexusGraphStore({ baseUrl: 'http://localhost:4040' });
    expect(store).toBeDefined();
  });

  describe('query()', () => {
    let store: GitNexusGraphStore;

    beforeAll(() => {
      store = new GitNexusGraphStore({ baseUrl: 'http://localhost:4040' });
    });

    afterAll(() => {
      store.close();
    });

    it('instantiates and has query method', () => {
        expect(store.query).toBeDefined();
    });
  });

  describe('traverse()', () => {
    let store: GitNexusGraphStore;

    beforeAll(() => {
      store = new GitNexusGraphStore({ baseUrl: 'http://localhost:4040' });
    });

    afterAll(() => {
      store.close();
    });

    it('instantiates and has traverse method', () => {
        expect(store.traverse).toBeDefined();
    });
  });
});
