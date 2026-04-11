import type {
  ModelProviderCapabilities,
  ModelInvocationRequest,
  ModelInvocationResponse,
  ProviderConfig,
  ProviderType,
} from '@udd/contracts';
import { BaseModelProviderAdapter } from './base.js';

const DEFAULT_ENDPOINT = 'https://api.anthropic.com';
const ANTHROPIC_VERSION = '2023-06-01';
const INVOKE_TIMEOUT_MS = 120_000;

export class AnthropicModelProviderAdapter extends BaseModelProviderAdapter {
  supports(providerType: ProviderType): boolean {
    return providerType === 'anthropic';
  }

  async getCapabilities(_config: ProviderConfig): Promise<ModelProviderCapabilities> {
    return {
      supportsStreaming: true,
      supportsTools: true,
      supportsImages: true,
      supportsJsonMode: false,
      maxContextHint: 200_000,
    };
  }

  async invoke(
    request: ModelInvocationRequest & { _credential: string },
  ): Promise<ModelInvocationResponse> {
    const { _credential, ...safeRequest } = request;
    void safeRequest; // logging reference only — never log _credential

    const endpoint = request.endpointUrl.replace(/\/$/, '') || DEFAULT_ENDPOINT;
    const url = `${endpoint}/v1/messages`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), INVOKE_TIMEOUT_MS);

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': _credential,
          'anthropic-version': ANTHROPIC_VERSION,
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
        errorCode: resp.status === 429 ? 'RATE_LIMITED' : resp.status === 401 ? 'INVALID_CREDENTIAL' : 'PROVIDER_UNAVAILABLE',
        errorMessage: (body['error'] as { message?: string } | undefined)?.message ?? `HTTP ${resp.status}`,
      };
    }

    const result: { providerMessageId?: string | null; status: 'completed'; output: Record<string, unknown> } = {
      status: 'completed',
      output: body,
    };
    const msgId = body['id'] as string | undefined;
    result.providerMessageId = msgId ?? null;
    return result;
  }
}
