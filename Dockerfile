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
COPY . .
RUN npm run build

# ─── Stage 3: Production deps only ────────────────────────────────────────────
FROM node:20-alpine AS prod-deps
WORKDIR /build
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/frontend/package*.json ./packages/frontend/
COPY packages/e2e/package*.json ./packages/e2e/
RUN npm ci --omit=dev

# ─── Stage 4: Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Backend compiled output
COPY --from=build     --chown=node:node /build/packages/backend/dist         ./dist
COPY --from=build     --chown=node:node /build/packages/backend/package.json ./package.json

# Production node_modules (hoisted to workspace root by npm workspaces)
COPY --from=prod-deps --chown=node:node /build/node_modules                  ./node_modules

# Frontend static files (served by Fastify in production)
COPY --from=build     --chown=node:node /build/packages/frontend/dist        ./frontend/dist

# Writable dirs
RUN mkdir -p /data/iso-store /data/db /tmp/isovault \
    && chown -R node:node /data /tmp/isovault

USER node
ENV NODE_ENV=production
EXPOSE 3721

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost:3721/health || exit 1

CMD ["node", "dist/server.js"]
