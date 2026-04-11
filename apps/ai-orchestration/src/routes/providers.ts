import { Router } from 'express';
import { authMiddleware, requirePermission } from '@udd/auth';
import type { ProviderConfig, PlatformEvent } from '@udd/contracts';
import { getContext } from '../context.js';

const router = Router();
router.use(authMiddleware);

function assertMember(ctx: ReturnType<typeof getContext>, userId: string, workspaceId: string) {
  return ctx.memberships.findByUserAndWorkspace(userId, workspaceId);
}

function toView(config: ProviderConfig) {
  // SECURITY: allowlist pattern — only expose fields that are safe for API clients.
  // New ProviderConfig fields default to HIDDEN until explicitly added here.
  return {
    id: config.id,
    workspaceId: config.workspaceId,
    createdByUserId: config.createdByUserId,
    name: config.name,
    providerType: config.providerType,
    endpointUrl: config.endpointUrl,
    modelCatalogMode: config.modelCatalogMode,
    authScheme: config.authScheme,
    isActive: config.isActive,
    isSystemManaged: config.isSystemManaged,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
    deletedAt: config.deletedAt,
    credentialStatus: 'active' as const,
  };
}

// GET /workspaces/:id/ai/providers
router.get('/workspaces/:id/ai/providers', requirePermission('ai.provider.read'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const membership = await assertMember(ctx, req.auth!.userId, req.params['id']!);
    if (!membership) return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });

    const cursor = req.query['cursor'] as string | undefined;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;
    const page = await ctx.providerConfigs.findByWorkspaceId(req.params['id']!, { cursor, limit });

    return res.json({
      data: page.items.map(toView),
      meta: { nextCursor: page.nextCursor, hasMore: page.hasMore },
      correlationId: req.correlationId,
    });
  } catch (err) { return next(err); }
});

// POST /workspaces/:id/ai/providers
router.post('/workspaces/:id/ai/providers', requirePermission('ai.provider.create'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const membership = await assertMember(ctx, req.auth!.userId, req.params['id']!);
    if (!membership) return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });

    const body = req.body as {
      name?: string;
      providerType?: ProviderConfig['providerType'];
      endpointUrl?: string;
      modelCatalogMode?: ProviderConfig['modelCatalogMode'];
      authScheme?: ProviderConfig['authScheme'];
      credential?: string; // plaintext credential — stored in secret manager, never DB
      // SECURITY: This field must NEVER be logged. Ensure request-logging
      // middleware redacts req.body.credential on these endpoints.
    };

    if (!body.name || !body.providerType || !body.endpointUrl || !body.authScheme || !body.credential) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'name, providerType, endpointUrl, authScheme, credential are required', correlationId: req.correlationId });
    }

    // Validate the adapter config before storing
    const adapter = ctx.resolveAdapter({ providerType: body.providerType } as ProviderConfig);
    const validation = await adapter.validateConfig({
      providerType: body.providerType,
      endpointUrl: body.endpointUrl,
      authScheme: body.authScheme,
    });
    if (!validation.valid) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: validation.errors.join('; '), correlationId: req.correlationId });
    }

    // Store credential in secret manager — NEVER in DB
    const secretRef = await ctx.secrets.createSecret(
      `provider-${req.params['id']}-${body.name}`,
      body.credential,
    );

    const config = await ctx.providerConfigs.create({
      workspaceId: req.params['id']!,
      createdByUserId: req.auth!.userId,
      name: body.name,
      providerType: body.providerType,
      endpointUrl: body.endpointUrl,
      modelCatalogMode: body.modelCatalogMode ?? 'static',
      authScheme: body.authScheme,
      credentialSecretRef: secretRef,
      isActive: true,
      isSystemManaged: false,
    });

    await ctx.auditLogs.append({
      workspaceId: req.params['id']!,
      actorUserId: req.auth!.userId,
      action: 'ai.provider.created',
      resourceType: 'provider_config',
      resourceId: config.id,
      metadata: { name: body.name, providerType: body.providerType },
    });

    await ctx.events.publish({
      topic: 'ai.provider.created',
      payload: { providerConfigId: config.id, workspaceId: config.workspaceId },
      correlationId: req.correlationId ?? 'unknown',
      timestamp: new Date().toISOString(),
    } as PlatformEvent);

    return res.status(201).json({ data: toView(config), correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

// GET /workspaces/:id/ai/providers/:providerConfigId
router.get('/workspaces/:id/ai/providers/:providerConfigId', requirePermission('ai.provider.read'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const membership = await assertMember(ctx, req.auth!.userId, req.params['id']!);
    if (!membership) return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });

    const config = await ctx.providerConfigs.findById(req.params['providerConfigId']!);
    if (!config || config.workspaceId !== req.params['id']!) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }

    return res.json({ data: toView(config), correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

// PATCH /workspaces/:id/ai/providers/:providerConfigId
router.patch('/workspaces/:id/ai/providers/:providerConfigId', requirePermission('ai.provider.update'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const membership = await assertMember(ctx, req.auth!.userId, req.params['id']!);
    if (!membership) return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });

    const config = await ctx.providerConfigs.findById(req.params['providerConfigId']!);
    if (!config || config.workspaceId !== req.params['id']!) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }

    const { name, endpointUrl, modelCatalogMode, isActive } = req.body as {
      name?: string;
      endpointUrl?: string;
      modelCatalogMode?: ProviderConfig['modelCatalogMode'];
      isActive?: boolean;
    };

    // SECURITY: Re-validate endpointUrl on update to prevent SSRF bypass
    if (endpointUrl) {
      const adapter = ctx.resolveAdapter(config);
      const validation = await adapter.validateConfig({
        providerType: config.providerType,
        endpointUrl,
        authScheme: config.authScheme,
      });
      if (!validation.valid) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: validation.errors.join('; '),
          correlationId: req.correlationId,
        });
      }
    }

    const updated = await ctx.providerConfigs.update(config.id, { name, endpointUrl, modelCatalogMode, isActive });

    await ctx.auditLogs.append({
      workspaceId: req.params['id']!,
      actorUserId: req.auth!.userId,
      action: 'ai.provider.updated',
      resourceType: 'provider_config',
      resourceId: config.id,
      metadata: { name, endpointUrl, isActive },
    });

    return res.json({ data: updated ? toView(updated) : null, correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

// DELETE /workspaces/:id/ai/providers/:providerConfigId
router.delete('/workspaces/:id/ai/providers/:providerConfigId', requirePermission('ai.provider.delete'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const membership = await assertMember(ctx, req.auth!.userId, req.params['id']!);
    if (!membership) return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });

    const config = await ctx.providerConfigs.findById(req.params['providerConfigId']!);
    if (!config || config.workspaceId !== req.params['id']!) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }

    await ctx.providerConfigs.softDelete(config.id);

    await ctx.auditLogs.append({
      workspaceId: req.params['id']!,
      actorUserId: req.auth!.userId,
      action: 'ai.provider.deleted',
      resourceType: 'provider_config',
      resourceId: config.id,
      metadata: {},
    });

    return res.status(204).send();
  } catch (err) { return next(err); }
});

// POST /workspaces/:id/ai/providers/:providerConfigId/rotate-secret
router.post('/workspaces/:id/ai/providers/:providerConfigId/rotate-secret', requirePermission('ai.provider.rotate_secret'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const membership = await assertMember(ctx, req.auth!.userId, req.params['id']!);
    if (!membership) return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });

    const config = await ctx.providerConfigs.findById(req.params['providerConfigId']!);
    if (!config || config.workspaceId !== req.params['id']!) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }

    const { credential } = req.body as { credential?: string };
    if (!credential) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'credential is required', correlationId: req.correlationId });
    }

    // Rotate in secret manager, get new ref
    const newSecretRef = await ctx.secrets.rotateSecret(config.credentialSecretRef, credential);

    // Update DB with new ref only
    await ctx.providerConfigs.update(config.id, { credentialSecretRef: newSecretRef });

    await ctx.auditLogs.append({
      workspaceId: req.params['id']!,
      actorUserId: req.auth!.userId,
      action: 'ai.provider.secret_rotated',
      resourceType: 'provider_config',
      resourceId: config.id,
      metadata: {},
    });

    return res.json({ data: { rotatedAt: new Date().toISOString() }, correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

export default router;
