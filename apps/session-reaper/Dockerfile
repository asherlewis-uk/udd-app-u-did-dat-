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
COPY apps/session-reaper/package.json apps/session-reaper/
RUN pnpm install --frozen-lockfile --prefer-offline

# ─── Stage 2: build ───────────────────────────────────────────────────────────
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/session-reaper/ apps/session-reaper/
RUN pnpm --filter @udd/contracts build \
 && pnpm --filter @udd/config build \
 && pnpm --filter @udd/observability build \
 && pnpm --filter @udd/database build \
 && pnpm --filter @udd/events build \
 && pnpm --filter @udd/session-reaper build

# ─── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/packages/config/dist ./packages/config/dist
COPY --from=build --chown=app:app /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build --chown=app:app /app/packages/database/dist ./packages/database/dist
COPY --from=build --chown=app:app /app/packages/events/dist ./packages/events/dist
COPY --from=build --chown=app:app /app/packages/observability/dist ./packages/observability/dist
COPY --from=build --chown=app:app /app/apps/session-reaper/dist ./apps/session-reaper/dist
COPY --from=build --chown=app:app /app/apps/session-reaper/package.json ./apps/session-reaper/
USER app
ENV NODE_ENV=production
# Reaper is a one-shot Cloud Run Job; no health endpoint needed.
CMD ["node", "/app/apps/session-reaper/dist/index.js"]
