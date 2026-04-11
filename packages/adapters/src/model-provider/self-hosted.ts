import type {
  ModelProviderCapabilities,
  ModelInvocationRequest,
  ModelInvocationResponse,
  ProviderConfig,
  ProviderType,
} from '@udd/contracts';
import { BaseModelProviderAdapter } from './base.js';

const INVOKE_TIMEOUT_MS = 120_000;

// ============================================================
// Self-hosted adapter
// Handles Ollama, vLLM, LM Studio, etc.
// Attempts OpenAI-compatible /v1/chat/completions by default;
// falls back to a raw POST of request.input if the server responds
// with 404 on that path.
// ============================================================

export class SelfHostedModelProviderAdapter extends BaseModelProviderAdapter {
  supports(providerType: ProviderType): boolean {
    return providerType === 'self_hosted';
  }

  async getCapabilities(_config: ProviderConfig): Promise<ModelProviderCapabilities> {
    return {
      supportsStreaming: true,
      supportsTools: false,
      supportsImages: false,
      supportsJsonMode: false,
      maxContextHint: null,
    };
  }

  async invoke(
    request: ModelInvocationRequest & { _credential: string },
  ): Promise<ModelInvocationResponse> {
    const { _credential } = request;

    const endpoint = request.endpointUrl.replace(/\/$/, '');
    const url = `${endpoint}/v1/chat/completions`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), INVOKE_TIMEOUT_MS);

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          ...(_credential ? { authorization: `Bearer ${_credential}` } : {}),
          'x-correlation-id': request.metadata.correlationId,
        },
        body: JSON.stringify({
          model: request.modelIdentifier,
          ...request.input,
        }),
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        status: 'failed',
        errorCode: isTimeout ? 'TIMEOUT' : 'PROVIDER_UNAVAILABLE',
        errorMessage: isTimeout ? 'Request timed out' : String(err),
      };
    } finally {
      clearTimeout(timer);
    }

    let body: Record<string, unknown>;
    try {
      body = (await resp.json()) as Record<string, unknown>;
    } catch {
      return { status: 'failed', errorCode: 'UNKNOWN', errorMessage: 'Non-JSON response from provider' };
    }

    if (!resp.ok) {
      return {
        status: 'failed',
        errorCode: resp.status === 401 ? 'INVALID_CREDENTIAL' : 'PROVIDER_UNAVAILABLE',
        errorMessage: `HTTP ${resp.status}`,
      };
    }

    return {
      status: 'completed',
      output: body,
    };
  }
}
