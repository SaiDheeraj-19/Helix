# =============================================================================
# Helix Frontend — Dockerfile
# Multi-stage: development + production
# =============================================================================

# ──────────────────────────────────────────
# Stage 1: Base
# ──────────────────────────────────────────
FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm" \
    PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

# ──────────────────────────────────────────
# Stage 2: Dependencies
# ──────────────────────────────────────────
FROM base AS deps

COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

# ──────────────────────────────────────────
# Stage 3: Development
# ──────────────────────────────────────────
FROM deps AS development

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ──────────────────────────────────────────
# Stage 4: Builder (for production)
# ──────────────────────────────────────────
FROM deps AS builder

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN npm run build

# ──────────────────────────────────────────
# Stage 5: Production runner
# ──────────────────────────────────────────
FROM base AS production

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000 \
    HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
