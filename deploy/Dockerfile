# syntax=docker/dockerfile:1
#
# Pantau Pangan — production images (multi-stage).
#
# Build context = repo root (lihat deploy/docker-compose.yml: context: ..).
# Target yang tersedia:
#   builder  -> build semua workspace (shared/scraper/api via bun, web via node)
#   api      -> runtime Hono+Bun (bundle dist/index.js + bun runtime saja)
#   web      -> runtime Next.js standalone (node + .next/standalone)
#   migrate  -> one-shot `drizzle-kit migrate` (dipakai via `docker compose run`)

# ---------- deps: install workspace dependencies ----------
# Base Node (untuk `next build`) + Bun 1.1.21 ter-pin (untuk install & build bun-target).
# Bun 1.1.21 tidak punya global TextEncoderStream yang dibutuhkan edge-runtime Next,
# jadi `next build` WAJIB dijalankan dengan runtime Node.
FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates unzip \
    && curl -fsSL https://github.com/oven-sh/bun/releases/download/bun-v1.1.21/bun-linux-x64.zip -o /tmp/bun.zip \
    && unzip -q /tmp/bun.zip -d /tmp/bun-extract \
    && mv /tmp/bun-extract/bun-linux-x64/bun /usr/local/bin/bun \
    && rm -rf /tmp/bun.zip /tmp/bun-extract \
    && apt-get purge -y --auto-remove unzip curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && bun --version

ENV HUSKY=0 \
    NEXT_TELEMETRY_DISABLED=1

# Konfigurasi build + workspace manifests
COPY package.json bun.lockb turbo.json tsconfig.json ./
COPY apps apps
COPY packages packages

# --frozen-lockfile: reprodusibel dari bun.lockb. HUSKY=0 menonaktifkan hook prepare.
RUN bun install --frozen-lockfile

# ---------- builder: build semua workspace ----------
FROM deps AS builder

# NEXT_PUBLIC_* di-inline saat `next build` — wajib di-set saat build image.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Urutan penting: shared dulu (dipakai scraper/api/web), lalu scraper & api,
# lalu web dengan runtime Node.
RUN cd /app/packages/shared && bun run build \
    && cd /app/packages/scraper && bun run build \
    && cd /app/apps/api && bun run build \
    && cd /app/apps/web && node /app/node_modules/next/dist/bin/next build

# ---------- api: runtime Hono + Bun ----------
FROM oven/bun:1.1.21-slim AS api
WORKDIR /app
ENV NODE_ENV=production

# `bun build --target=bun` membundle seluruh dependency ke satu file.
COPY --from=builder /app/apps/api/dist ./dist

EXPOSE 3001
USER bun
CMD ["bun", "run", "dist/index.js"]

# ---------- web: runtime Next.js standalone ----------
FROM node:22-alpine AS web
WORKDIR /app
ENV NODE_ENV=production

# Monorepo: Next menelusuri output mulai dari workspace root, jadi standalone
# berisi apps/web/server.js + node_modules hasil trace. Pertahankan struktur
# folder supaya relative path di dalam server.js tetap valid.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
USER node
WORKDIR /app/apps/web
CMD ["node", "server.js"]

# ---------- migrate: one-shot drizzle migrations ----------
FROM deps AS migrate
WORKDIR /app
CMD ["bun", "run", "--filter=@pantau-pangan/api", "db:migrate"]
