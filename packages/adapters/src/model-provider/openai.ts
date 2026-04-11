import type {
  ModelProviderCapabilities,
  ModelInvocationRequest,
  ModelInvocationResponse,
  ProviderConfig,
  ProviderType,
} from '@udd/contracts';
import { BaseModelProviderAdapter } from './base.js';

const DEFAULT_ENDPOINT = 'https://api.openai.com';
const INVOKE_TIMEOUT_MS = 120_000;

export class OpenAIModelProviderAdapter extends BaseModelProviderAdapter {
  supports(providerType: ProviderType): boolean {
    return providerType === 'openai';
  }

  async getCapabilities(_config: ProviderConfig): Promise<ModelProviderCapabilities> {
    return {
      supportsStreaming: true,
      supportsTools: true,
      supportsImages: true,
      supportsJsonMode: true,
      maxContextHint: 128_000,
    };
  }

  async invoke(
    request: ModelInvocationRequest & { _credential: string },
  ): Promise<ModelInvocationResponse> {
    return invokeOpenAICompatible(request, DEFAULT_ENDPOINT);
  }
}

/**
 * Shared implementation for both OpenAI and OpenAI-compatible adapters.
 * endpointOverride is used when the caller provides a custom base URL.
 */
export async function invokeOpenAICompatible(
  request: ModelInvocationRequest & { _credential: string },
  defaultEndpoint: string,
): Promise<ModelInvocationResponse> {
  const { _credential } = request;

  const endpoint = request.endpointUrl.replace(/\/$/, '') || defaultEndpoint;
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
        'authorization': `Bearer ${_credential}`,
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
    const errObj = body['error'] as { message?: string; code?: string } | undefined;
    return {
      status: 'failed',
      errorCode: resp.status === 429 ? 'RATE_LIMITED' : resp.status === 401 ? 'INVALID_CREDENTIAL' : 'PROVIDER_UNAVAILABLE',
      errorMessage: errObj?.message ?? `HTTP ${resp.status}`,
    };
  }

  const choices = body['choices'] as Array<{ message: unknown }> | undefined;
  const msgId = body['id'] as string | undefined;
  const result: { providerMessageId?: string | null; status: 'completed'; output: Record<string, unknown> } = {
    status: 'completed',
    output: { choices, usage: body['usage'] },
  };
  result.providerMessageId = msgId ?? null;
  return result;
}
