import type {
  ModelProviderCapabilities,
  ModelInvocationRequest,
  ModelInvocationResponse,
  ProviderConfig,
  ProviderType,
} from '@udd/contracts';
import { BaseModelProviderAdapter } from './base.js';
import { invokeOpenAICompatible } from './openai.js';

// ============================================================
// OpenAI-compatible adapter
// Handles any provider that exposes the OpenAI Chat Completions API.
// endpointUrl from the ProviderConfig is used as-is — no default base.
// ============================================================

export class OpenAICompatibleModelProviderAdapter extends BaseModelProviderAdapter {
  supports(providerType: ProviderType): boolean {
    return providerType === 'openai_compatible';
  }

  async getCapabilities(_config: ProviderConfig): Promise<ModelProviderCapabilities> {
    return {
      supportsStreaming: true,
      supportsTools: false, // conservative default — actual capability unknown
      supportsImages: false,
      supportsJsonMode: true,
      maxContextHint: null,
    };
  }

  async invoke(
    request: ModelInvocationRequest & { _credential: string },
  ): Promise<ModelInvocationResponse> {
    // The endpointUrl is the full base URL; invokeOpenAICompatible appends /v1/chat/completions
    return invokeOpenAICompatible(request, request.endpointUrl);
  }
}
