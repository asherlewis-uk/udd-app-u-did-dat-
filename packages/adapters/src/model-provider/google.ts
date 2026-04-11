import type {
  ModelProviderCapabilities,
  ModelInvocationRequest,
  ModelInvocationResponse,
  ProviderConfig,
  ProviderType,
} from '@udd/contracts';
import { BaseModelProviderAdapter } from './base.js';

const DEFAULT_ENDPOINT = 'https://generativelanguage.googleapis.com';
const INVOKE_TIMEOUT_MS = 120_000;

/**
 * SECURITY NOTE: The Gemini REST API requires the API key in the URL query
 * string (?key=...). This is a known Google API design limitation. The key
 * will appear in Google-side server access logs. To mitigate leakage on our
 * side, never log the full request URL from this adapter. The redactUrl()
 * helper below strips the key before any logging.
 */

function redactUrl(url: string): string {
  return url.replace(/([?&])key=[^&]+/, '$1key=REDACTED');
}

export class GoogleModelProviderAdapter extends BaseModelProviderAdapter {
  supports(providerType: ProviderType): boolean {
    return providerType === 'google';
  }

  async getCapabilities(_config: ProviderConfig): Promise<ModelProviderCapabilities> {
    return {
      supportsStreaming: true,
      supportsTools: true,
      supportsImages: true,
      supportsJsonMode: true,
      maxContextHint: 1_000_000,
    };
  }

  async invoke(
    request: ModelInvocationRequest & { _credential: string },
  ): Promise<ModelInvocationResponse> {
    const { _credential } = request;

    const endpoint = request.endpointUrl.replace(/\/$/, '') || DEFAULT_ENDPOINT;
    // Gemini REST: POST /v1beta/models/{model}:generateContent?key={apiKey}
    const url = `${endpoint}/v1beta/models/${encodeURIComponent(request.modelIdentifier)}:generateContent?key=${encodeURIComponent(_credential)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), INVOKE_TIMEOUT_MS);

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': request.metadata.correlationId,
        },
        body: JSON.stringify(request.input),
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        status: 'failed',
        errorCode: isTimeout ? 'TIMEOUT' : 'PROVIDER_UNAVAILABLE',
        // Never include raw error string — it may contain the URL with the API key
        errorMessage: isTimeout ? 'Request timed out' : `Provider request failed (${redactUrl(url)})`,
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
      const errObj = body['error'] as { message?: string; status?: string } | undefined;
      return {
        status: 'failed',
        errorCode: resp.status === 429 ? 'RATE_LIMITED' : resp.status === 401 ? 'INVALID_CREDENTIAL' : 'PROVIDER_UNAVAILABLE',
        errorMessage: errObj?.message ?? `HTTP ${resp.status}`,
      };
    }

    return {
      status: 'completed',
      output: body,
    };
  }
}
