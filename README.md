# 🫧 Pantau Pangan

> _Gelembung harga pangan strategis nasional._

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

| Layer         | Stack                                                                        | Versi (M1)                    |
| ------------- | ---------------------------------------------------------------------------- | ----------------------------- |
| Monorepo      | Turborepo + Bun workspaces                                                   | turbo 2.9                     |
| TypeScript    | TypeScript strict                                                            | 6.0                           |
| Lint + Format | ESLint flat + Prettier + typescript-eslint                                   | eslint 10, ts-eslint 8        |
| Git hooks     | Husky v9 + lint-staged + commitlint                                          | husky 9.1                     |
| Backend       | Hono.js + Bun + Drizzle ORM + PostgreSQL                                     | hono 4.12                     |
| Frontend      | Next.js (App Router) + React + Tailwind + D3.js + shadcn/ui + TanStack Query | next 16, react 19, tailwind 4 |
| Scraper       | Bun fetch native (zero dependency)                                           | —                             |
| LLM           | OpenRouter (V1) → Claude Haiku (V2)                                          | —                             |
| Deploy        | Vercel (web) + Railway (api + db)                                            | —                             |

> Versi tooling di atas adalah yang ter-resolve saat M1 setup. Update via `bun add` akan mengikuti latest stable. Jangan downgrade tanpa alasan kuat.

---

## Struktur Monorepo

```
pantau-pangan/
├── apps/
│   ├── api/        → Hono.js + Bun (port 3001)
│   └── web/        → Next.js App Router + Tailwind v4 (port 3000)
└── packages/
    ├── shared/     → types, utils, constants — leaf, dipakai FE/BE/scraper
    └── scraper/    → Bun fetch ke BI PIHPS (M1: placeholder, M2: implementasi)
```

Tooling root: `tsconfig.json`, `turbo.json`, `eslint.config.js` (single source flat config), `.prettierrc.json`, `.prettierignore`, `commitlint.config.js`, `.husky/`. Tidak ada ESLint config per-package — semua dilint dari root.

---

## Prasyarat

- [Bun](https://bun.sh) >= 1.1.0 (di-pin lewat `packageManager` di root `package.json`)
- PostgreSQL >= 15 (untuk M2+, M1 belum butuh DB)
- Git (Husky hook butuh repo Git)

> Tidak butuh Node.js terpisah untuk dev. Tools `next`/`react` di-resolve dari `node_modules` lewat Bun PM, walaupun internal Next.js tetap jalan di runtime Node — itu transparan ke developer.

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

| Script                 | Kegunaan                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| `bun install`          | Install semua workspace + register Husky hooks (lifecycle `prepare`) |
| `bun run dev`          | Jalankan api + web paralel (Turborepo persistent)                    |
| `bun run dev:api`      | Jalankan api saja (port 3001)                                        |
| `bun run dev:web`      | Jalankan web saja (port 3000)                                        |
| `bun run build`        | Build semua apps + packages (topological lewat Turborepo)            |
| `bun run lint`         | Lint semua packages dari root flat config                            |
| `bun run lint:fix`     | Lint + auto-fix                                                      |
| `bun run typecheck`    | `tsc --noEmit` di setiap package                                     |
| `bun run format`       | Format semua file lewat Prettier                                     |
| `bun run format:check` | Cek format tanpa write                                               |
| `bun run scrape`       | Jalankan scraper (M1: placeholder, M2: implementasi)                 |

Hampir semua run pakai Turborepo cache — run kedua hampir instant kalau tidak ada perubahan.

---

## API Endpoints

Base URL: `http://localhost:3001`

| Method | Path                      | Kegunaan                                   |
| ------ | ------------------------- | ------------------------------------------ |
| `GET`  | `/komoditas`              | List semua komoditas + harga + % perubahan |
| `GET`  | `/komoditas/:id/historis` | Historis harga dari DB                     |
| `GET`  | `/komoditas/:id/detail`   | Tabel geografis live dari BI               |
| `GET`  | `/komoditas/:id/insight`  | LLM insight (cached per hari)              |
| `GET`  | `/provinsi`               | List semua provinsi                        |

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

| Dokumen                                          | Keterangan                       |
| ------------------------------------------------ | -------------------------------- |
| [`docs/api-reference.md`](docs/api-reference.md) | Dokumentasi endpoint BI PIHPS    |
| [`docs/architecture.md`](docs/architecture.md)   | Keputusan teknis & desain sistem |
| [`PRD.md`](PRD.md)                               | Product Requirements Document    |
| [`CLAUDE.md`](CLAUDE.md)                         | Panduan untuk AI agents          |

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
