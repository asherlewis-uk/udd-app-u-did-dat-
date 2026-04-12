# ─── Stage 1: install all workspace deps ──────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/database/package.json packages/database/
COPY packages/observability/package.json packages/observability/
COPY apps/gateway/package.json apps/gateway/
RUN pnpm install --frozen-lockfile --prefer-offline

# ─── Stage 2: build ───────────────────────────────────────────────────────────
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/auth/ packages/auth/
COPY packages/config/ packages/config/
COPY packages/contracts/ packages/contracts/
COPY packages/database/ packages/database/
COPY packages/observability/ packages/observability/
COPY apps/gateway/ apps/gateway/
RUN pnpm --filter @udd/contracts build \
 && pnpm --filter @udd/config build \
 && pnpm --filter @udd/observability build \
 && pnpm --filter @udd/auth build \
 && pnpm --filter @udd/database build \
 && pnpm --filter @udd/gateway build

# ─── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/packages/auth/dist ./packages/auth/dist
COPY --from=build --chown=app:app /app/packages/config/dist ./packages/config/dist
COPY --from=build --chown=app:app /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build --chown=app:app /app/packages/database/dist ./packages/database/dist
COPY --from=build --chown=app:app /app/packages/observability/dist ./packages/observability/dist
COPY --from=build --chown=app:app /app/apps/gateway/dist ./apps/gateway/dist
COPY --from=build --chown=app:app /app/apps/gateway/package.json ./apps/gateway/
USER app
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ready || exit 1
CMD ["node", "/app/apps/gateway/dist/index.js"]
