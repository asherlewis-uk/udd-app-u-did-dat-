# ─── Stage 1: install all workspace deps ──────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/events/package.json packages/events/
COPY packages/observability/package.json packages/observability/
COPY apps/host-agent/package.json apps/host-agent/
RUN pnpm install --frozen-lockfile --prefer-offline

# ─── Stage 2: build ───────────────────────────────────────────────────────────
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/config/ packages/config/
COPY packages/contracts/ packages/contracts/
COPY packages/events/ packages/events/
COPY packages/observability/ packages/observability/
COPY apps/host-agent/ apps/host-agent/
RUN pnpm --filter @udd/contracts build \
 && pnpm --filter @udd/config build \
 && pnpm --filter @udd/observability build \
 && pnpm --filter @udd/events build \
 && pnpm --filter @udd/host-agent build

# ─── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/packages/config/dist ./packages/config/dist
COPY --from=build --chown=app:app /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build --chown=app:app /app/packages/events/dist ./packages/events/dist
COPY --from=build --chown=app:app /app/packages/observability/dist ./packages/observability/dist
COPY --from=build --chown=app:app /app/apps/host-agent/dist ./apps/host-agent/dist
COPY --from=build --chown=app:app /app/apps/host-agent/package.json ./apps/host-agent/
USER app
ENV NODE_ENV=production
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD pgrep -x node || exit 1
CMD ["node", "/app/apps/host-agent/dist/index.js"]
