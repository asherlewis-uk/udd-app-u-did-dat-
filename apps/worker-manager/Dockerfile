# ─── Stage 1: install all workspace deps ──────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/database/package.json packages/database/
COPY packages/events/package.json packages/events/
COPY packages/observability/package.json packages/observability/
COPY apps/worker-manager/package.json apps/worker-manager/
RUN pnpm install --frozen-lockfile --prefer-offline

# ─── Stage 2: build ───────────────────────────────────────────────────────────
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/worker-manager/ apps/worker-manager/
RUN pnpm --filter @udd/contracts build \
 && pnpm --filter @udd/config build \
 && pnpm --filter @udd/observability build \
 && pnpm --filter @udd/database build \
 && pnpm --filter @udd/events build \
 && pnpm --filter @udd/worker-manager build
RUN pnpm --filter @udd/worker-manager deploy /app/deploy --prod

# ─── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/deploy ./
USER app
ENV NODE_ENV=production
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3005}/ready || exit 1
CMD ["node", "dist/index.js"]
