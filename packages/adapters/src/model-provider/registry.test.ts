import { describe, it, expect } from 'vitest';
import { resolveAdapter, resolveAdapterForConfig, listAdapters } from './registry.js';
import { makeProviderConfig } from '@udd/testing';
import type { ProviderType } from '@udd/contracts';

const ALL_PROVIDER_TYPES: ProviderType[] = [
  'anthropic',
  'openai',
  'google',
  'openai_compatible',
  'self_hosted',
];

describe('resolveAdapter', () => {
  it('resolves an adapter for every registered provider type', () => {
    for (const type of ALL_PROVIDER_TYPES) {
      const adapter = resolveAdapter(type);
      expect(adapter).toBeDefined();
      expect(adapter.supports(type)).toBe(true);
    }
  });

  it('throws for an unregistered provider type', () => {
    expect(() => resolveAdapter('unknown_provider' as ProviderType)).toThrow(
      /No ModelProviderAdapter registered/,
    );
  });

  it('each adapter only claims to support its own type', () => {
    for (const type of ALL_PROVIDER_TYPES) {
      const adapter = resolveAdapter(type);
      for (const otherType of ALL_PROVIDER_TYPES) {
        if (otherType !== type) {
          expect(adapter.supports(otherType)).toBe(false);
        }
      }
    }
  });
});

describe('resolveAdapterForConfig', () => {
  it('resolves the correct adapter from a ProviderConfig', () => {
    const config = makeProviderConfig({ providerType: 'openai' });
    const adapter = resolveAdapterForConfig(config);
    expect(adapter.supports('openai')).toBe(true);
  });
});

describe('listAdapters', () => {
  it('returns entries for all provider types', () => {
    const listed = listAdapters();
    const types = listed.map((a) => a.providerType);
    for (const type of ALL_PROVIDER_TYPES) {
      expect(types).toContain(type);
    }
  });
});
