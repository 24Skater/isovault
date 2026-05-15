# ─── Stage 1: Install all deps ────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /build
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/frontend/package*.json ./packages/frontend/
COPY packages/e2e/package*.json ./packages/e2e/
RUN npm ci

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /build
COPY --from=deps /build/node_modules ./node_modules
COPY --from=deps /build/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=deps /build/packages/frontend/node_modules ./packages/frontend/node_modules
COPY . .
RUN npm run build

# ─── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN addgroup -S isomgr && adduser -S isomgr -G isomgr

WORKDIR /app

# Backend dist + production deps
COPY --from=build --chown=isomgr:isomgr /build/packages/backend/dist         ./dist
COPY --from=build --chown=isomgr:isomgr /build/packages/backend/node_modules ./node_modules
COPY --from=build --chown=isomgr:isomgr /build/packages/backend/package.json ./package.json

# Frontend static files (served by Fastify in production)
COPY --from=build --chown=isomgr:isomgr /build/packages/frontend/dist        ./frontend/dist

# Writable dirs
RUN mkdir -p /data/iso-store /data/db /tmp/isovault \
    && chown -R isomgr:isomgr /data /tmp/isovault

USER isomgr
ENV NODE_ENV=production
EXPOSE 3721

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost:3721/health || exit 1

CMD ["node", "dist/server.js"]
