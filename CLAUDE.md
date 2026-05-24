# Panduan untuk AI Agents — Pantau Pangan

> Panduan untuk AI agents yang bekerja di repository ini.
> Baca file ini sebelum melakukan perubahan apapun.

---

## Tentang Project

**Pantau Pangan** adalah visualisasi harga pangan strategis nasional berbasis bubble chart interaktif. Data bersumber dari API publik Bank Indonesia PIHPS (`bi.go.id/hargapangan`). Tidak ada auth yang dibutuhkan untuk mengakses API BI.

Dokumen lengkap ada di:

- `PRD.md` — fitur, scope, dan keputusan produk
- `docs/api-reference.md` — semua endpoint BI, struktur response, cara fetch
- `docs/architecture.md` — keputusan teknis, DB schema, data flow, kalkulasi bubble

**Baca ketiga dokumen tersebut sebelum mulai coding.**

---

## State M1 Foundation (sudah selesai)

M1 sudah menyelesaikan fondasi monorepo. Saat memulai task baru, asumsikan state berikut sudah ada — JANGAN setup ulang atau ubah:

### Tooling versi yang ter-resolve

- Bun 1.1.21 (pinned di `package.json` field `packageManager`)
- TypeScript 6.0 strict (`tsconfig.json` di root, semua package extends ini)
- Turborepo 2.x (`turbo.json` dengan key `tasks`, bukan `pipeline` v1)
- ESLint 10.x flat config (`eslint.config.js` ESM, single source — TIDAK ada eslint config per-package)
- typescript-eslint 8.x (idiomatic `tseslint.config()` helper, typed-linting di-scope ke `**/*.{ts,tsx,mts,cts}`)
- Prettier 3.x
- Husky 9.x (`core.hooksPath=.husky/_`, hook file tanpa shebang)
- lint-staged, @commitlint/cli + config-conventional
- Next.js 16.x + React 19.x + Tailwind 4.x (zero-config, no `tailwind.config.ts`, setup via `postcss.config.mjs`)
- Hono 4.x

### Struktur monorepo

```
pantau-pangan/
├── package.json                       # workspace root + 11 scripts + lint-staged
├── tsconfig.json                      # Base_Tsconfig strict
├── turbo.json                         # 5 tasks: build, typecheck, lint, dev, scrape
├── eslint.config.js                   # flat config single source
├── .prettierrc.json + .prettierignore
├── commitlint.config.js
├── .husky/{pre-commit, commit-msg, pre-push}
├── .gitignore + .env.example
├── apps/
│   ├── api/      # Hono + Bun, port 3001
│   │   ├── package.json
│   │   ├── tsconfig.json (extends ../../tsconfig.json + types: ["bun"])
│   │   └── src/index.ts
│   └── web/      # Next 16 + Tailwind 4, port 3000
│       ├── package.json
│       ├── tsconfig.json (extends root + Next-specific)
│       ├── next.config.ts (TS config, Next 15+ feature)
│       ├── postcss.config.mjs (@tailwindcss/postcss)
│       ├── next-env.d.ts
│       ├── public/
│       └── app/{layout.tsx, page.tsx, globals.css, favicon.ico}
└── packages/
    ├── shared/   # leaf, dual export ESM
    │   ├── package.json (main, types, exports.")
    │   ├── tsconfig.json + tsconfig.build.json
    │   └── src/{index.ts, types.ts, constants.ts, utils.ts}
    └── scraper/  # Bun fetch zero-dep, M2 implementation pending
        ├── package.json
        ├── tsconfig.json
        └── src/index.ts
```

### Convention yang sudah berlaku

- `next.config.ts` (BUKAN `.mjs`) — Next.js 15+ support TS config natively. Jangan rename ke `.mjs`.
- Tailwind v4 zero-config — TIDAK ada `tailwind.config.ts`. Customization via `globals.css` `@theme` block + `postcss.config.mjs`.
- ESLint `parserOptions.projectService.allowDefaultProject: ['*.config.ts']` — hanya untuk root-level config files. **Jangan tambah** pattern `apps/*/*.config.ts` atau `packages/*/*.config.ts` — itu konflik dengan tsconfig per-package yang `include: ["**/*.ts"]`.
- ESLint config per-package DIHAPUS oleh design — kalau scaffold tool generate (mis. `create-next-app`), hapus dan andalkan root flat config.
- `bun.lockb` (binary) ter-track. Kalau upgrade ke Bun 1.2+, lockfile bisa migrate ke `bun.lock` text format — di-handle waktu upgrade Bun saja.
- `*.tsbuildinfo` di `.gitignore` (artefak `incremental: true` di tsconfig apps/web).
- Tidak ada folder `dist/` atau `.next/` di-track Git — semua di-gitignore. Generate ulang via `bun run build`.

### Cara install dependency baru

WAJIB pakai `bun add` / `bun add -d`, JANGAN edit `package.json` deps manual:

```bash
# Tambah ke workspace tertentu
bun add <pkg> --filter=@pantau-pangan/api
bun add -d <pkg> --filter=@pantau-pangan/web

# Tambah ke root (devTools)
bun add -d <pkg>

# Workspace dependency (mis. shared dipakai package lain)
bun add @pantau-pangan/shared@workspace:* --filter=@pantau-pangan/scraper
```

### Verifikasi cepat semua tooling jalan

```bash
bun install                    # symlink workspaces, register husky hooks
bun run typecheck              # 5/5 packages, run kedua FULL TURBO cache
bun run lint                   # 4/4 packages
bun run build                  # 4 artifacts (apps/web/.next, apps/api/dist, packages/{shared,scraper}/dist)
bun run dev                    # api :3001 + web :3000 paralel
```

---

## Monorepo Structure

```
pantau-pangan/
├── apps/
│   ├── api/        → Hono.js + Bun + Drizzle + PostgreSQL
│   └── web/        → Next.js + D3.js + shadcn/ui + TanStack Query
└── packages/
    ├── shared/     → types, utils, constants — dipakai FE dan BE
    └── scraper/    → Bun fetch ke BI PIHPS, zero dependency
```

---

## Rules yang Wajib Diikuti

### Umum

- **Selalu gunakan TypeScript** — tidak ada file `.js` di dalam `src/` (config files seperti `eslint.config.js`, `next.config.ts`, `postcss.config.mjs` boleh sesuai konvensi tool)
- **Selalu gunakan Bun** sebagai runtime + package manager — `bun add`, `bun run`. Tidak ada `npm`, `yarn`, atau `pnpm`. Internal Next.js akan tetap pakai Node.js runtime — itu transparan dan OK.
- **Conventional commits** — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`, `perf:`, `ci:`, `build:`, `revert:`. commitlint enforce di pre-commit hook.
- **Jangan commit `.env`** — gunakan `.env.example` untuk template
- **Jangan setup ulang tooling** — M1 sudah pin tooling (eslint flat config, husky v9, dll). Kalau perlu adjust, pastikan tidak break Task M1 yang sudah hijau (bisa cek via `bun run typecheck && bun run lint && bun run build`).
- **`bun run` diutamakan** dibanding `bunx <pkg>` langsung untuk script yang sudah ada di `package.json` — supaya konsisten dengan Turborepo cache.

### Backend (`apps/api`)

- **Route handler harus tipis** — logic bisnis ada di `services/`, bukan di `routes/`
- Ini penting untuk migrasi V1 (REST) → V2 (tRPC) yang direncanakan
- Contoh yang benar:

  ```typescript
  // routes/komoditas.ts — BENAR
  app.get('/', async (c) => {
    const data = await getAllKomoditas(c.req.query())
    return c.json(data)
  })

  // routes/komoditas.ts — SALAH (logic di dalam route)
  app.get('/', async (c) => {
    const rows = await db.select().from(komoditas).where(...) // jangan taruh di sini
    return c.json(rows)
  })
  ```

- **Drizzle untuk semua query DB** — tidak ada raw SQL kecuali ada alasan kuat
- **Upsert idempotent** — scraper bisa dijalankan ulang tanpa duplikasi data

### Frontend (`apps/web`)

- **TanStack Query untuk semua data fetching** — tidak ada `fetch` langsung di komponen (dipasang di M4)
- **shadcn/ui untuk komponen UI** — tidak perlu buat komponen dari scratch untuk hal umum (dipasang di M4 lewat `bunx shadcn@latest init`)
- **D3.js hanya untuk bubble chart** — komponen lain pakai shadcn/ui + Tailwind
- **Tailwind v4** sudah ter-setup di M1 — customize via `app/globals.css` `@theme` block, bukan `tailwind.config.ts` (v4 zero-config). PostCSS plugin di `postcss.config.mjs`.
- **Next.js App Router** — semua route di `apps/web/app/`. Pakai server components by default; tambahkan `'use client'` directive hanya kalau perlu (mis. komponen interaktif D3, hook `useState`, dll).
- **Konfigurasi Next.js di `next.config.ts`** (TypeScript, bukan `.mjs`). Sudah include `transpilePackages: ['@pantau-pangan/shared']` — JANGAN hapus.

### Scraper (`packages/scraper`)

- **Hanya Bun native fetch** — tidak ada library HTTP tambahan (axios, ky, dll)
- **Semua endpoint BI public** — tidak butuh session, cookie, atau header khusus
- Endpoint yang dipakai: `GetCommoditiesTree` dan `GetDetailGridData2` saja
- `GetChartData` **tidak dipakai** — `tempId` session-based, tidak bisa diakses dari server
- Baca `docs/api-reference.md` untuk detail lengkap setiap endpoint

### Shared (`packages/shared`)

- Semua types yang dipakai FE dan BE harus didefinisikan di sini
- Kalkulasi % perubahan, normalisasi bubble size, dan warna bubble ada di sini
- Jangan duplikasi type yang sudah ada di `shared/` di package lain

---

## Data Source — Hal Penting

Semua dari `docs/api-reference.md`, tapi ini yang paling kritis:

### `GetDetailGridData2`

- Parameter `date` **diabaikan server** — selalu return 5 hari terakhir
- Response punya key tanggal dinamis: `"22/05/2026": 48350.0`
- Parse dengan filter regex: `/^\d{2}\/\d{2}\/\d{4}$/`
- `level` field: `0` = nasional, `1` = provinsi, `2` = kota, `3` = pasar

### `GetCommoditiesTree`

- 21 komoditas leaf, 10 kategori
- `comId` di node leaf = integer yang dipakai sebagai `ComId` di endpoint lain
- Node parent tidak punya `comId`

### Parameter fix selalu dikirim

```
PriceTypeId=1   → Pasar Tradisional
isPasokan=1
```

---

## Database

Gunakan Drizzle ORM. Schema ada di `apps/api/src/db/schema.ts`.

**Tabel utama:**

```
komoditas     → master komoditas (com_id = ID dari BI)
provinsi      → master provinsi (bi_id = id dari response BI)
kota          → master kota (FK ke provinsi)
pasar         → master pasar (FK ke kota)
harga_harian  → fact table per LEVEL (0=nasional, 1=provinsi, 2=kota, 3=pasar)
                Simpan apa adanya dari BI, jangan re-aggregate.
insight_cache → LLM cache (komoditas + provinsi NULL=nasional, cache_date eksplisit)
```

**Aturan penting `harga_harian`:**

- Setiap row punya `level` (0–3) dan FK lokasi yang sesuai dengan level (lihat `chk_level_fk` di `architecture.md` section 3).
- Bubble chart nasional → query `WHERE level = 0`. Bubble chart provinsi → `WHERE level = 1 AND provinsi_id = ?`. **Jangan re-aggregate dari level 3.**
- Upsert pakai `UNIQUE NULLS NOT DISTINCT (komoditas_id, level, provinsi_id, kota_id, pasar_id, tanggal)` — Postgres 15+.

**Query penting:**

```typescript
// % perubahan timeframe per (komoditas, level, provinsi):
// (harga_hari_ini - harga_tanggal_target) / harga_tanggal_target * 100
// tanggal_target = MAX(tanggal) WHERE tanggal <= target_date
//                  AND level + provinsi_id sama dengan query saat ini
```

---

## Kalkulasi Bubble

Detail di `docs/architecture.md` section 5. Aturannya: **threshold per timeframe, ukuran absolut (capped)**.

```typescript
// packages/shared/src/constants.ts
export const VOLATILITY_THRESHOLDS = {
  '1D': { stable: 0.5, significant: 2 },
  '1W': { stable: 2, significant: 5 },
  '1M': { stable: 5, significant: 10 },
  '3M': { stable: 10, significant: 20 },
  '1Y': { stable: 15, significant: 30 },
} as const

// Ukuran bubble (absolut, di-cap di significant)
const BUBBLE_MIN_RADIUS = 30
const BUBBLE_MAX_RADIUS = 120
// radius = MIN + clamp(|perubahan| / significant, 0..1) * (MAX - MIN)

// Warna bubble (per timeframe)
// |%| < stable/5         → #6b7280 abu (stabil)
// % >=  significant      → #ef4444 merah   (naik signifikan)
// % >   0                → #f97316 oranye  (naik biasa)
// % <= -significant      → #22c55e hijau tua (turun signifikan)
// % <   0                → #84cc16 hijau muda (turun biasa)

// Aksesibilitas: WAJIB tampilkan arrow (↑/↓) di label, jangan andalkan warna.
// Sparkline hanya jika radius >= 50px, selain itu pindah ke tooltip.
```

---

## LLM Integration

- Provider V1: **OpenRouter** via env `OPENROUTER_API_KEY`
- Cache: 1 entry per `(komoditas_id, provinsi_id, cache_date)` di tabel `insight_cache`
- Generate on-demand, bukan pre-generate
- Prompt template ada di `docs/architecture.md` section 6

---

## API Endpoints

```
GET /komoditas                    → list + harga + % perubahan
GET /komoditas/:id/historis       → historis harga dari DB
GET /komoditas/:id/detail         → proxy GetDetailGridData2 (live dari BI)
GET /komoditas/:id/insight        → LLM insight (cache atau generate)
GET /provinsi                     → list provinsi

Query params:
?provinsiId=0     → filter provinsi (0 = nasional)
?timeframe=1D     → 1D | 1W | 1M | 3M | 1Y
```

---

## Environment Variables

```bash
# apps/api
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=sk-or-...
API_PORT=3001

# apps/web
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Commands

```bash
bun install          # install semua dependencies
bun run dev          # jalankan api + web paralel
bun run dev:api      # jalankan api saja
bun run dev:web      # jalankan web saja
bun run scrape       # jalankan scraper manual
bun run build        # build semua
bun run lint         # lint semua
bun run db:migrate   # jalankan migrations
bun run db:studio    # buka Drizzle Studio
```

---

## Migration Path V1 → V2

V2 akan migrasi REST ke tRPC. **Supaya mudah, dari V1 pastikan:**

1. Business logic ada di `services/`, bukan di `routes/`
2. Types sudah terdefinisi di `packages/shared/`
3. TanStack Query sudah dipakai di FE (tRPC pakai TanStack Query juga)

Migrasi V2 = wrap service functions ke tRPC procedure. Estimasi ~5 menit per route.

---

## Yang Tidak Boleh Dilakukan

- ❌ Jangan install Playwright — tidak diperlukan, semua endpoint BI public
- ❌ Jangan taruh business logic di route handler
- ❌ Jangan duplikasi types — selalu cek `packages/shared/` dulu
- ❌ Jangan pakai `GetChartData` — `tempId` session-based, tidak bisa diakses server
- ❌ Jangan commit secret atau API key
- ❌ Jangan pakai raw SQL jika bisa pakai Drizzle
- ❌ Jangan buat HTTP request langsung di komponen React — pakai TanStack Query
- ❌ **Jangan re-aggregate** harga nasional/provinsi dari level pasar — `harga_harian` sudah simpan per level dari BI
- ❌ **Jangan pakai threshold tunggal** untuk warna/ukuran bubble — selalu pakai `VOLATILITY_THRESHOLDS[timeframe]` dari `packages/shared`
- ❌ **Jangan tambah ESLint config per-package** — single source = `eslint.config.js` di root. Kalau scaffold tool generate, hapus.
- ❌ **Jangan rename `next.config.ts` ke `.mjs`** — Next 15+ support TS config dan kita pakai itu.
- ❌ **Jangan buat `tailwind.config.ts`** — Tailwind v4 zero-config. Customize via `app/globals.css` `@theme` block.
- ❌ **Jangan edit `package.json` deps manual** — selalu `bun add` / `bun add -d` supaya lockfile konsisten.
- ❌ **Jangan tambah `apps/*/*.config.ts` ke ESLint `allowDefaultProject`** — itu konflik dengan tsconfig per-package yang `include: ["**/*.ts"]`.
