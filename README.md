# 🫧 Pantau Pangan

> *Gelembung harga pangan strategis nasional.*

Visualisasi harga 21 komoditas pangan strategis berbasis bubble chart interaktif. Terinspirasi dari [CryptoBubbles](https://cryptobubbles.net/), data bersumber dari [BI PIHPS](https://www.bi.go.id/hargapangan).

> Semakin besar bubble = semakin volatile harganya. Merah = naik, hijau = turun.

---

## Fitur

- 🫧 Bubble chart 21 komoditas pangan strategis
- 📊 Filter timeframe: 1D / 1W / 1M / 3M / 1Y
- 🗺️ Filter per provinsi
- 🔍 Search komoditas
- 🤖 LLM insight per komoditas (via OpenRouter)
- 🌙 Dark / light mode
- 📈 Akumulasi historis harian di database sendiri

---

## Tech Stack

| Layer | Stack |
|---|---|
| Monorepo | Turborepo + Bun workspaces |
| Backend | Hono.js + Bun + Drizzle ORM + PostgreSQL |
| Frontend | Next.js + D3.js + shadcn/ui + TanStack Query |
| Scraper | Bun fetch (zero dependency) |
| LLM | OpenRouter (V1) |
| Deploy | Vercel (web) + Railway (api + db) |

---

## Struktur Monorepo

```
pantau-pangan/
├── apps/
│   ├── api/        → Hono.js REST API + cron scraper
│   └── web/        → Next.js frontend
└── packages/
    ├── shared/     → types, utils, constants
    └── scraper/    → Bun fetch ke BI PIHPS
```

---

## Prasyarat

- [Bun](https://bun.sh) >= 1.1.0
- PostgreSQL >= 15
- Node.js >= 20 (untuk Next.js)

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/username/pantau-pangan.git
cd pantau-pangan
bun install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pantau_pangan

# LLM
OPENROUTER_API_KEY=sk-or-...

# App
API_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Setup database

```bash
# Buat database
createdb pantau_pangan

# Jalankan migrations
bun run --cwd apps/api db:migrate
```

### 4. Seed master data

```bash
# Ambil data komoditas dari BI dan simpan ke DB
bun run scrape
```

### 5. Jalankan development

```bash
# Jalankan semua apps sekaligus
bun run dev

# Atau per app
bun run dev:api   → http://localhost:3001
bun run dev:web   → http://localhost:3000
```

---

## Scripts

| Script | Kegunaan |
|---|---|
| `bun run dev` | Jalankan semua apps (api + web) paralel |
| `bun run build` | Build semua apps |
| `bun run scrape` | Jalankan scraper sekali (manual) |
| `bun run lint` | Lint semua packages |
| `bun run db:migrate` | Jalankan database migrations |
| `bun run db:studio` | Buka Drizzle Studio (DB GUI) |

---

## API Endpoints

Base URL: `http://localhost:3001`

| Method | Path | Kegunaan |
|---|---|---|
| `GET` | `/komoditas` | List semua komoditas + harga + % perubahan |
| `GET` | `/komoditas/:id/historis` | Historis harga dari DB |
| `GET` | `/komoditas/:id/detail` | Tabel geografis live dari BI |
| `GET` | `/komoditas/:id/insight` | LLM insight (cached per hari) |
| `GET` | `/provinsi` | List semua provinsi |

Query params: `?provinsiId=0&timeframe=1D`

---

## Deploy

### Railway (API + DB)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login dan deploy
railway login
railway up
```

Set environment variables di Railway dashboard.

### Vercel (Web)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd apps/web
vercel
```

Set `NEXT_PUBLIC_API_URL` ke URL Railway API kamu.

---

## Dokumentasi

| Dokumen | Keterangan |
|---|---|
| [`docs/api-reference.md`](docs/api-reference.md) | Dokumentasi endpoint BI PIHPS |
| [`docs/architecture.md`](docs/architecture.md) | Keputusan teknis & desain sistem |
| [`PRD.md`](PRD.md) | Product Requirements Document |
| [`CLAUDE.md`](CLAUDE.md) | Panduan untuk AI agents |

---

## Kontribusi

Commit message menggunakan [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: tambah filter per provinsi
fix: perbaiki kalkulasi perubahan timeframe 1W
chore: update dependencies
docs: update README
```

---

## Lisensi

MIT
