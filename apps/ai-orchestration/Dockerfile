# ─── Stage 1: install all workspace deps ──────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/adapters/package.json packages/adapters/
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/database/package.json packages/database/
COPY packages/events/package.json packages/events/
COPY packages/observability/package.json packages/observability/
COPY apps/ai-orchestration/package.json apps/ai-orchestration/
RUN pnpm install --frozen-lockfile --prefer-offline

# ─── Stage 2: build ───────────────────────────────────────────────────────────
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/ai-orchestration/ apps/ai-orchestration/
RUN pnpm --filter @udd/contracts build \
 && pnpm --filter @udd/config build \
 && pnpm --filter @udd/observability build \
 && pnpm --filter @udd/database build \
 && pnpm --filter @udd/auth build \
 && pnpm --filter @udd/adapters build \
 && pnpm --filter @udd/events build \
 && pnpm --filter @udd/ai-orchestration build

# ─── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/packages/adapters/package.json ./packages/adapters/
COPY --from=build --chown=app:app /app/packages/adapters/dist ./packages/adapters/dist
COPY --from=build --chown=app:app /app/packages/auth/package.json ./packages/auth/
COPY --from=build --chown=app:app /app/packages/auth/dist ./packages/auth/dist
COPY --from=build --chown=app:app /app/packages/config/package.json ./packages/config/
COPY --from=build --chown=app:app /app/packages/config/dist ./packages/config/dist
COPY --from=build --chown=app:app /app/packages/contracts/package.json ./packages/contracts/
COPY --from=build --chown=app:app /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build --chown=app:app /app/packages/database/package.json ./packages/database/
COPY --from=build --chown=app:app /app/packages/database/dist ./packages/database/dist
COPY --from=build --chown=app:app /app/packages/events/package.json ./packages/events/
COPY --from=build --chown=app:app /app/packages/events/dist ./packages/events/dist
COPY --from=build --chown=app:app /app/packages/observability/package.json ./packages/observability/
COPY --from=build --chown=app:app /app/packages/observability/dist ./packages/observability/dist
COPY --from=build --chown=app:app /app/apps/ai-orchestration/dist ./apps/ai-orchestration/dist
COPY --from=build --chown=app:app /app/apps/ai-orchestration/package.json ./apps/ai-orchestration/
USER app
ENV NODE_ENV=production
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-8080}/ready || exit 1
CMD ["node", "/app/apps/ai-orchestration/dist/index.js"]
