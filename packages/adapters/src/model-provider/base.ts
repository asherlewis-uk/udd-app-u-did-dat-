import type {
  ModelProviderAdapter,
  ModelProviderCapabilities,
  ModelInvocationRequest,
  ModelInvocationResponse,
  ProviderConfig,
  ProviderType,
  AuthScheme,
  INVOCATION_ERROR_CODES,
} from '@udd/contracts';

// ============================================================
// SSRF protection — block requests to internal/private networks
// ============================================================

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,       // IPv4 loopback
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,         // RFC 1918 Class A
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // RFC 1918 Class B
  /^192\.168\.\d{1,3}\.\d{1,3}$/,            // RFC 1918 Class C
  /^169\.254\.\d{1,3}\.\d{1,3}$/,            // Link-local / AWS metadata
  /^0\.0\.0\.0$/,
  /^\[::1?\]$/,                               // IPv6 loopback
  /^metadata\.google\.internal$/i,            // GCP metadata
  /\.internal$/i,                             // Generic internal TLD
];

function isBlockedHost(hostname: string): boolean {
  return BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

// ============================================================
// Base adapter — shared utilities for all provider adapters
// ============================================================

export abstract class BaseModelProviderAdapter implements ModelProviderAdapter {
  abstract supports(providerType: ProviderType): boolean;
  abstract getCapabilities(config: ProviderConfig): Promise<ModelProviderCapabilities>;

  async validateConfig(input: {
    providerType: ProviderType;
    endpointUrl: string;
    authScheme: AuthScheme;
  }): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate endpoint URL format
    try {
      const url = new URL(input.endpointUrl);
      if (!['https:', 'http:'].includes(url.protocol)) {
        errors.push(`Endpoint URL must use http or https protocol`);
      }

      // SECURITY: Block SSRF to private/internal networks, cloud metadata, and loopback
      const hostname = url.hostname.toLowerCase();
      if (isBlockedHost(hostname)) {
        errors.push(
          `Endpoint URL must not point to private, loopback, or cloud metadata addresses`,
        );
      }
    } catch {
      errors.push(`Endpoint URL is not a valid URL: ${input.endpointUrl}`);
    }

    // Subclasses can add provider-specific validation
    const subErrors = await this.validateProviderConfig(input);
    errors.push(...subErrors);

    return { valid: errors.length === 0, errors };
  }

  protected async validateProviderConfig(_input: {
    providerType: ProviderType;
    endpointUrl: string;
    authScheme: AuthScheme;
  }): Promise<string[]> {
    return [];
  }

  abstract invoke(
    request: ModelInvocationRequest & { _credential: string },
  ): Promise<ModelInvocationResponse>;

  // -------------------------------------------------------
  // Shared HTTP helper — builds authorization header
  // -------------------------------------------------------

  protected buildAuthHeader(
    scheme: AuthScheme,
    credential: string,
  ): Record<string, string> {
    switch (scheme) {
      case 'api_key_header':
        return { 'x-api-key': credential };
      case 'bearer_token':
        return { Authorization: `Bearer ${credential}` };
      case 'custom_header':
        // Custom headers are passed separately via customHeadersEncryptedRef
        return {};
    }
  }

  protected notImplementedResponse(): ModelInvocationResponse {
    return {
      status: 'failed',
      errorCode: 'NOT_IMPLEMENTED' satisfies keyof typeof INVOCATION_ERROR_CODES,
      errorMessage: 'Adapter invoke not yet implemented',
    };
  }

  /**
   * Strip the credential from the request before any logging.
   * Call this before passing the request to logging utilities.
   */
  protected redactRequest(
    request: ModelInvocationRequest & { _credential: string },
  ): ModelInvocationRequest {
    const { _credential: _removed, ...safe } = request;
    void _removed; // suppress unused warning
    return safe;
  }
}
