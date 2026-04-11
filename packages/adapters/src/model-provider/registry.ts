import type { ModelProviderAdapter, ProviderConfig, ProviderType } from '@udd/contracts';
import { AnthropicModelProviderAdapter } from './anthropic.js';
import { OpenAIModelProviderAdapter } from './openai.js';
import { GoogleModelProviderAdapter } from './google.js';
import { OpenAICompatibleModelProviderAdapter } from './openai-compatible.js';
import { SelfHostedModelProviderAdapter } from './self-hosted.js';

// ============================================================
// Adapter registry — resolves the correct adapter for a ProviderConfig.
// This is the ONLY place adapter instances are created.
// ============================================================

const REGISTERED_ADAPTERS: ModelProviderAdapter[] = [
  new AnthropicModelProviderAdapter(),
  new OpenAIModelProviderAdapter(),
  new GoogleModelProviderAdapter(),
  new OpenAICompatibleModelProviderAdapter(),
  new SelfHostedModelProviderAdapter(),
];

/**
 * Resolve the correct adapter for the given provider type.
 * Throws if no adapter is registered for the type — this is a programming error.
 */
export function resolveAdapter(providerType: ProviderType): ModelProviderAdapter {
  const adapter = REGISTERED_ADAPTERS.find((a) => a.supports(providerType));
  if (!adapter) {
    throw new Error(
      `No ModelProviderAdapter registered for providerType '${providerType}'. ` +
        `This is a programming error — all provider types must have a registered adapter.`,
    );
  }
  return adapter;
}

/**
 * Resolve an adapter from a ProviderConfig.
 */
export function resolveAdapterForConfig(config: ProviderConfig): ModelProviderAdapter {
  return resolveAdapter(config.providerType);
}

/**
 * List all registered adapters (for diagnostics only).
 */
export function listAdapters(): Array<{ providerType: string }> {
  return [
    { providerType: 'anthropic' },
    { providerType: 'openai' },
    { providerType: 'google' },
    { providerType: 'openai_compatible' },
    { providerType: 'self_hosted' },
  ];
}
