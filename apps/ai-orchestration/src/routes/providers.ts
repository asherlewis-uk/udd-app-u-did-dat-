import { Router } from 'express';
import { authMiddleware } from '@udd/auth';
import type { ProviderConfig } from '@udd/contracts';
import { getContext } from '../context.js';
import { mapProviderConfigView } from './public-view-mappers.js';

const router: Router = Router();
router.use(authMiddleware);

function toView(config: ProviderConfig) {
  return mapProviderConfigView(config, 'active');
}

// =======================================================
// CANONICAL: /me/ai/providers
// =======================================================

router.get('/me/ai/providers', async (req, res, next) => {
  try {
    const ctx = getContext();
    const cursor = req.query['cursor'] as string | undefined;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;
    if (limit !== undefined && isNaN(limit))
      return res
        .status(400)
        .json({
          code: 'VALIDATION_ERROR',
          message: 'invalid limit',
          correlationId: req.correlationId,
        });

    const pageOpts: { cursor?: string; limit?: number } = {};
    if (cursor !== undefined) pageOpts.cursor = cursor;
    if (limit !== undefined) pageOpts.limit = limit;
    const page = await ctx.providerConfigs.findByUserId(req.auth!.userId, pageOpts);

    return res.json({
      data: page.items.map(toView),
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/me/ai/providers', async (req, res, next) => {
  try {
    const ctx = getContext();
    const workspaces = await ctx.workspaces.findByUserId(req.auth!.userId);
    const homeWorkspace = workspaces[0];
    if (!homeWorkspace)
      return res
        .status(409)
        .json({ code: 'PROJECT_CONTAINER_UNAVAILABLE', correlationId: req.correlationId });

    const body = req.body as any;
    if (
      !body.name ||
      !body.providerType ||
      !body.endpointUrl ||
      !body.authScheme ||
      !body.credential
    ) {
      return res
        .status(400)
        .json({
          code: 'VALIDATION_ERROR',
          message: 'missing fields',
          correlationId: req.correlationId,
        });
    }

    const adapter = ctx.resolveAdapter({ providerType: body.providerType } as ProviderConfig);
    const validation = await adapter.validateConfig(body);
    if (!validation.valid)
      return res
        .status(400)
        .json({
          code: 'VALIDATION_ERROR',
          message: validation.errors.join('; '),
          correlationId: req.correlationId,
        });

    const secretRef = await ctx.secrets.createSecret(
      `provider-${homeWorkspace.id}-${body.name}`,
      body.credential,
    );

    const config = await ctx.providerConfigs.create({
      workspaceId: homeWorkspace.id,
      createdByUserId: req.auth!.userId,
      name: body.name,
      providerType: body.providerType,
      endpointUrl: body.endpointUrl,
      modelCatalogMode: body.modelCatalogMode ?? 'manual',
      authScheme: body.authScheme,
      credentialSecretRef: secretRef,
      isActive: true,
      isSystemManaged: false,
    });

    await ctx.auditLogs.append({
      workspaceId: homeWorkspace.id,
      actorUserId: req.auth!.userId,
      action: 'ai.provider.created',
      resourceType: 'provider_config',
      resourceId: config.id,
      metadata: { name: body.name },
    });

    return res.status(201).json({ data: toView(config), correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
});

router.get('/me/ai/providers/:providerConfigId', async (req, res, next) => {
  try {
    const ctx = getContext();
    const config = await ctx.providerConfigs.findById(req.params['providerConfigId']!);
    if (!config || config.createdByUserId !== req.auth!.userId) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }
    return res.json({ data: toView(config), correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
});

router.patch('/me/ai/providers/:providerConfigId', async (req, res, next) => {
  try {
    const ctx = getContext();
    const config = await ctx.providerConfigs.findById(req.params['providerConfigId']!);
    if (!config || config.createdByUserId !== req.auth!.userId) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }
    const body = req.body as any;
    if (body.endpointUrl) {
      const adapter = ctx.resolveAdapter(config);
      const validation = await adapter.validateConfig({ ...config, endpointUrl: body.endpointUrl });
      if (!validation.valid)
        return res
          .status(400)
          .json({
            code: 'VALIDATION_ERROR',
            message: validation.errors.join('; '),
            correlationId: req.correlationId,
          });
    }
    const updated = await ctx.providerConfigs.update(config.id, body);
    return res.json({ data: updated ? toView(updated) : null, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
});

router.delete('/me/ai/providers/:providerConfigId', async (req, res, next) => {
  try {
    const ctx = getContext();
    const config = await ctx.providerConfigs.findById(req.params['providerConfigId']!);
    if (!config || config.createdByUserId !== req.auth!.userId) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }
    await ctx.providerConfigs.softDelete(config.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

router.post('/me/ai/providers/:providerConfigId/rotate-secret', async (req, res, next) => {
  try {
    const ctx = getContext();
    const config = await ctx.providerConfigs.findById(req.params['providerConfigId']!);
    if (!config || config.createdByUserId !== req.auth!.userId) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }
    const { newCredential } = req.body as { newCredential?: string };
    if (!newCredential)
      return res
        .status(400)
        .json({
          code: 'VALIDATION_ERROR',
          message: 'newCredential missing',
          correlationId: req.correlationId,
        });

    const newSecretRef = await ctx.secrets.rotateSecret(config.credentialSecretRef, newCredential);
    await ctx.providerConfigs.update(config.id, { credentialSecretRef: newSecretRef });
    return res.json({
      data: { rotatedAt: new Date().toISOString() },
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
