import { Router } from 'express';
import { authMiddleware, requirePermission } from '@udd/auth';
import type { AgentRole } from '@udd/contracts';
import { getContext } from '../context.js';

const router: Router = Router();
router.use(authMiddleware);

async function assertMember(
  ctx: ReturnType<typeof getContext>,
  userId: string,
  workspaceId: string,
) {
  return ctx.memberships.findByUserAndWorkspace(userId, workspaceId);
}

router.get(
  '/workspaces/:id/ai/roles',
  requirePermission('ai.role.read'),
  async (req, res, next) => {
    try {
      const ctx = getContext();
      if (!(await assertMember(ctx, req.auth!.userId, req.params['id']!))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }
      const cursor = req.query['cursor'] as string | undefined;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;
      if (limit !== undefined && isNaN(limit))
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'limit must be a positive integer',
          correlationId: req.correlationId,
        });
      const page = await ctx.agentRoles.findByWorkspaceId(req.params['id']!, {
        ...(cursor !== undefined && { cursor }),
        ...(limit !== undefined && { limit }),
      });
      return res.json({
        data: page.items,
        meta: { nextCursor: page.nextCursor, hasMore: page.hasMore },
        correlationId: req.correlationId,
      });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/workspaces/:id/ai/roles',
  requirePermission('ai.role.create'),
  async (req, res, next) => {
    try {
      const ctx = getContext();
      if (!(await assertMember(ctx, req.auth!.userId, req.params['id']!))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }

      const body = req.body as {
        name?: string;
        description?: string;
        providerConfigId?: string;
        modelIdentifier?: string;
        endpointOverrideUrl?: string;
        roleConfigJson?: Record<string, unknown>;
      };

      if (!body.name || !body.providerConfigId || !body.modelIdentifier) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'name, providerConfigId, modelIdentifier are required',
          correlationId: req.correlationId,
        });
      }

      // Validate providerConfigId exists in this workspace
      const providerConfig = await ctx.providerConfigs.findById(body.providerConfigId);
      if (!providerConfig || providerConfig.workspaceId !== req.params['id']!) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'providerConfigId not found in this workspace',
          correlationId: req.correlationId,
        });
      }

      const role = await ctx.agentRoles.create({
        workspaceId: req.params['id']!,
        createdByUserId: req.auth!.userId,
        name: body.name,
        description: body.description ?? null,
        providerConfigId: body.providerConfigId,
        modelIdentifier: body.modelIdentifier,
        endpointOverrideUrl: body.endpointOverrideUrl ?? null,
        roleConfigJson: body.roleConfigJson ?? {},
        isActive: true,
      });

      await ctx.auditLogs.append({
        workspaceId: req.params['id']!,
        actorUserId: req.auth!.userId,
        action: 'ai.role.created',
        resourceType: 'agent_role',
        resourceId: role.id,
        metadata: { name: body.name, providerConfigId: body.providerConfigId },
      });

      return res.status(201).json({ data: role, correlationId: req.correlationId });
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/workspaces/:id/ai/roles/:agentRoleId',
  requirePermission('ai.role.read'),
  async (req, res, next) => {
    try {
      const ctx = getContext();
      if (!(await assertMember(ctx, req.auth!.userId, req.params['id']!))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }
      const role = await ctx.agentRoles.findById(req.params['agentRoleId']!);
      if (!role || role.workspaceId !== req.params['id']!) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }
      return res.json({ data: role, correlationId: req.correlationId });
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/workspaces/:id/ai/roles/:agentRoleId',
  requirePermission('ai.role.update'),
  async (req, res, next) => {
    try {
      const ctx = getContext();
      if (!(await assertMember(ctx, req.auth!.userId, req.params['id']!))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }
      const role = await ctx.agentRoles.findById(req.params['agentRoleId']!);
      if (!role || role.workspaceId !== req.params['id']!) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }

      const { name, description, modelIdentifier, endpointOverrideUrl, roleConfigJson, isActive } =
        req.body as Partial<
          Pick<
            AgentRole,
            | 'name'
            | 'description'
            | 'modelIdentifier'
            | 'endpointOverrideUrl'
            | 'roleConfigJson'
            | 'isActive'
          >
        >;
      const updated = await ctx.agentRoles.update(role.id, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(modelIdentifier !== undefined && { modelIdentifier }),
        ...(endpointOverrideUrl !== undefined && { endpointOverrideUrl }),
        ...(roleConfigJson !== undefined && { roleConfigJson }),
        ...(isActive !== undefined && { isActive }),
      });

      await ctx.auditLogs.append({
        workspaceId: req.params['id']!,
        actorUserId: req.auth!.userId,
        action: 'ai.role.updated',
        resourceType: 'agent_role',
        resourceId: role.id,
        metadata: { name, isActive },
      });

      return res.json({ data: updated, correlationId: req.correlationId });
    } catch (err) {
      return next(err);
    }
  },
);

router.delete(
  '/workspaces/:id/ai/roles/:agentRoleId',
  requirePermission('ai.role.delete'),
  async (req, res, next) => {
    try {
      const ctx = getContext();
      if (!(await assertMember(ctx, req.auth!.userId, req.params['id']!))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }
      const role = await ctx.agentRoles.findById(req.params['agentRoleId']!);
      if (!role || role.workspaceId !== req.params['id']!) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }
      await ctx.agentRoles.delete(role.id);
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
