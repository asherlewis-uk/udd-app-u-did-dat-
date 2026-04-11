# ADR 005: ModelProviderAdapter Boundary

**Status**: Accepted  
**Date**: 2026-04-11

## Context

The platform allows users to configure their own AI providers (Anthropic, OpenAI, Google, self-hosted). We need a way to:
- Support multiple providers with a single application interface
- Keep provider credentials out of application logs and traces
- Allow swapping providers without changing business logic
- Prevent SDK vendor lock-in in the core application

## Decision

All model invocations must go through the `ModelProviderAdapter` interface defined in `packages/contracts`. Concrete adapter implementations live in `packages/adapters`. Provider SDKs may only be imported within adapter implementation files.

**Enforcement**: ESLint rules will be configured to flag imports of provider SDKs (`@anthropic-ai/sdk`, `openai`, `@google-ai/generativelanguage`) outside of `packages/adapters/src/model-provider/`.

**Credential flow**:
1. Provider config stores a `credentialSecretRef` (never the plaintext credential).
2. At invocation time, `ai-orchestration` fetches the credential from the secret manager.
3. The credential is passed to the adapter as `request._credential` — a convention that signals it must never be logged.
4. The adapter uses the credential to make the HTTP call and returns a `ModelInvocationResponse`.
5. The credential is not stored anywhere and goes out of scope after the call.

## Consequences

- Adding a new provider = adding a new adapter class in `packages/adapters`. No other services change.
- Audit logs and traces never contain credential values by design.
- All adapters return the same `ModelInvocationResponse` shape, enabling pipeline orchestration without provider-specific logic.
- Phase 1 adapters are stubs returning `NOT_IMPLEMENTED`. Phase 2 implements real HTTP calls.
