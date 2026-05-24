# Architecture — Pantau Pangan
> Keputusan teknis, alasan stack, dan struktur sistem

**Version:** 1.0  
**Last updated:** Mei 2026

---

## 1. Monorepo Structure

```
pantau-pangan/
├── package.json              ← root workspace (Bun + Turborepo)
├── turbo.json                ← Turborepo pipeline config
├── tsconfig.json             ← base tsconfig, di-extend tiap package
├── .env.example
├── .gitignore
│
├── apps/
│   ├── api/                  ← Hono.js backend
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts      ← entry point, Hono app + cron
│   │       ├── routes/       ← route handlers (thin, delegasi ke services)
│   │       │   ├── komoditas.ts
│   │       │   ├── insight.ts
│   │       │   └── provinsi.ts
│   │       ├── services/     ← business logic (dipisah dari routes — penting untuk migrasi tRPC)
│   │       │   ├── komoditas.service.ts
│   │       │   ├── insight.service.ts
│   │       │   └── harga.service.ts
│   │       └── db/
│   │           ├── schema.ts ← Drizzle schema
│   │           └── index.ts  ← Drizzle client
│   │
│   └── web/                  ← Next.js frontend
│       ├── package.json
│       └── src/
│           ├── app/          ← App Router
│           ├── components/
│           │   ├── bubble/   ← D3.js bubble chart components
│           │   ├── modal/    ← detail modal components
│           │   └── ui/       ← shadcn/ui components
│           └── lib/
│               ├── api.ts    ← fetch helpers ke apps/api
│               └── utils.ts
│
└── packages/
    ├── shared/               ← types, utils, constants (dipakai FE + BE)
    │   ├── package.json
    │   └── src/
    │       ├── types.ts
    │       ├── constants.ts
    │       └── utils.ts
    │
    └── scraper/              ← Bun fetch ke BI PIHPS
        ├── package.json
        └── src/
            ├── index.ts      ← entry point, bisa dijalankan standalone
            ├── fetcher.ts    ← HTTP calls ke BI API
            └── parser.ts     ← transform raw response → internal types
```

---

## 2. Tech Stack & Alasan Pemilihan

### 2.1 Monorepo Tooling

| Tool | Alasan |
|---|---|
| **Turborepo** | Build cache, parallel tasks, dependency graph antar package. Sweet spot antara simplicity dan power |
| **Bun workspaces** | Native workspace support, satu `bun install` di root untuk semua packages |

### 2.2 Backend

| Tool | Alasan |
|---|---|
| **Bun** | Runtime yang sangat cepat, native TypeScript, built-in fetch, built-in test runner, native cron scheduler |
| **Hono.js** | Lightweight, edge-ready, type-safe, performa tinggi. Cocok dengan Bun |
| **Drizzle ORM** | Type-safe, syntax mirip SQL (belajar ORM sekaligus ngerti SQL), ringan, support Bun dengan baik |
| **PostgreSQL** | Robust, battle-tested, free tier di Railway cukup untuk v1 |

### 2.3 Frontend

| Tool | Alasan |
|---|---|
| **Next.js (App Router)** | Standard React framework, SSR/SSG built-in, deploy mudah ke Vercel |
| **D3.js** | Standar industri untuk custom data visualization, force simulation untuk bubble physics |
| **shadcn/ui** | Component library yang tidak opinionated, bisa di-customize, cocok untuk bagian UI non-bubble |
| **Tailwind CSS** | Utility-first, konsisten dengan shadcn/ui |
| **TanStack Query** | Data fetching + caching di FE. Bonus: tRPC pakai TanStack Query di balik layar, migrasi V2 lebih mulus |

### 2.4 Scraper

| Tool | Alasan |
|---|---|
| **Bun native fetch** | Semua endpoint BI public, zero auth — tidak butuh Playwright atau library lain |

> **Catatan:** Sempat dipertimbangkan Playwright untuk session management, namun setelah investigasi ternyata semua endpoint BI bisa diakses tanpa auth sama sekali.

### 2.5 LLM

| Tool | Alasan |
|---|---|
| **OpenRouter (V1)** | Gratis/murah untuk eksperimen, banyak model pilihan |
| **Claude API / Haiku (V2)** | Upgrade setelah V1 stabil, lebih konsisten dan controllable |

### 2.6 Code Quality

| Tool | Alasan |
|---|---|
| **ESLint + Prettier** | Lint + formatting, standar industri |
| **Husky + lint-staged** | Pre-commit hook, hanya lint file yang berubah (lebih cepat) |
| **commitlint** | Enforce conventional commits — `feat:`, `fix:`, `chore:`, `docs:` |
| **tsc --noEmit** | Type check di pre-push hook, cegah type error masuk repo |

### 2.7 Deploy

| Service | Dipakai untuk | Alasan |
|---|---|---|
| **Vercel** | `apps/web` | Native Next.js support, free tier cukup, zero config |
| **Railway** | `apps/api` + PostgreSQL | Support Bun native, bisa handle API + DB dalam satu project/dashboard |

---

## 3. Database Schema

> **Prinsip desain:** simpan data BI **apa adanya per level** (0/1/2/3). BI sudah expose angka level 0 (nasional) dan level 1 (provinsi) langsung di response `GetDetailGridData2`. Re-aggregate sendiri akan menghasilkan angka berbeda dari yang user lihat di bi.go.id (BI mungkin punya weighting yang tidak transparan) dan bikin query bubble chart lebih mahal. Schema di bawah optimized untuk read di level granularity manapun tanpa join/aggregate.

```sql
-- Master data komoditas
CREATE TABLE komoditas (
  id         SERIAL PRIMARY KEY,
  tree_id    VARCHAR(10) NOT NULL,    -- e.g. "1_1" dari GetCommoditiesTree
  com_id     INTEGER NOT NULL UNIQUE, -- comId dari BI, dipakai di API calls
  nama       VARCHAR(100) NOT NULL,
  kategori   VARCHAR(50) NOT NULL,
  satuan     VARCHAR(20) DEFAULT 'kg',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master data geografis
CREATE TABLE provinsi (
  id         SERIAL PRIMARY KEY,
  bi_id      INTEGER NOT NULL UNIQUE,         -- id dari response BI level 1
  nama       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kota (
  id          SERIAL PRIMARY KEY,
  provinsi_id INTEGER NOT NULL REFERENCES provinsi(id),
  nama        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provinsi_id, nama)
);

CREATE TABLE pasar (
  id         SERIAL PRIMARY KEY,
  kota_id    INTEGER NOT NULL REFERENCES kota(id),
  nama       VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (kota_id, nama)
);

-- Fact table — simpan SEMUA level (0=nasional, 1=provinsi, 2=kota, 3=pasar)
-- apa adanya dari response BI. Tidak ada agregasi runtime.
CREATE TABLE harga_harian (
  id           SERIAL PRIMARY KEY,
  komoditas_id INTEGER NOT NULL REFERENCES komoditas(id),
  level        SMALLINT NOT NULL,                          -- 0|1|2|3
  provinsi_id  INTEGER REFERENCES provinsi(id),            -- NULL saat level=0
  kota_id      INTEGER REFERENCES kota(id),                -- NULL saat level<=1
  pasar_id     INTEGER REFERENCES pasar(id),               -- NULL saat level<=2
  harga        NUMERIC(12, 2) NOT NULL,
  tanggal      DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Konsistensi level vs FK yang diisi
  CONSTRAINT chk_level_fk CHECK (
    (level = 0 AND provinsi_id IS NULL AND kota_id IS NULL AND pasar_id IS NULL) OR
    (level = 1 AND provinsi_id IS NOT NULL AND kota_id IS NULL AND pasar_id IS NULL) OR
    (level = 2 AND provinsi_id IS NOT NULL AND kota_id IS NOT NULL AND pasar_id IS NULL) OR
    (level = 3 AND provinsi_id IS NOT NULL AND kota_id IS NOT NULL AND pasar_id IS NOT NULL)
  ),

  -- Idempotent upsert: 1 row per (komoditas, level, lokasi, tanggal)
  -- Postgres 15+ NULLS NOT DISTINCT supaya NULL == NULL untuk uniqueness
  UNIQUE NULLS NOT DISTINCT
    (komoditas_id, level, provinsi_id, kota_id, pasar_id, tanggal)
);

-- Cache LLM insight
-- cache_date eksplisit (bukan generated_at::DATE) supaya UNIQUE biasa
-- bisa dipakai dan compatible dengan Drizzle.
CREATE TABLE insight_cache (
  id           SERIAL PRIMARY KEY,
  komoditas_id INTEGER NOT NULL REFERENCES komoditas(id),
  provinsi_id  INTEGER REFERENCES provinsi(id),  -- NULL = nasional
  cache_date   DATE NOT NULL,                    -- tanggal WIB saat di-generate
  insight      TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- NULLS NOT DISTINCT supaya cache nasional (provinsi_id NULL) unik per hari
  UNIQUE NULLS NOT DISTINCT (komoditas_id, provinsi_id, cache_date)
);
```

**Index:**
```sql
-- Query bubble chart utama: SELECT ... WHERE komoditas_id IN (...) AND level = 0|1
CREATE INDEX idx_harga_komoditas_level_tanggal
  ON harga_harian(komoditas_id, level, tanggal DESC);

-- Query filter provinsi: SELECT ... WHERE komoditas_id = ? AND level = 1 AND provinsi_id = ?
CREATE INDEX idx_harga_komoditas_level_prov_tanggal
  ON harga_harian(komoditas_id, level, provinsi_id, tanggal DESC)
  WHERE level >= 1;

-- Cache lookup
CREATE INDEX idx_insight_lookup
  ON insight_cache(komoditas_id, provinsi_id, cache_date DESC);
```

**ERD:**
```mermaid
erDiagram
  komoditas {
    int id PK
    string tree_id
    int com_id UK
    string nama
    string kategori
    string satuan
  }
  provinsi {
    int id PK
    int bi_id UK
    string nama UK
  }
  kota {
    int id PK
    int provinsi_id FK
    string nama
  }
  pasar {
    int id PK
    int kota_id FK
    string nama
  }
  harga_harian {
    int id PK
    int komoditas_id FK
    int level
    int provinsi_id FK "nullable"
    int kota_id FK "nullable"
    int pasar_id FK "nullable"
    decimal harga
    date tanggal
  }
  insight_cache {
    int id PK
    int komoditas_id FK
    int provinsi_id FK "nullable"
    date cache_date
    text insight
    timestamptz generated_at
  }
  provinsi ||--o{ kota : "punya"
  kota ||--o{ pasar : "punya"
  komoditas ||--o{ harga_harian : "punya"
  provinsi ||--o{ harga_harian : "punya (level>=1)"
  kota ||--o{ harga_harian : "punya (level>=2)"
  pasar ||--o{ harga_harian : "punya (level=3)"
  komoditas ||--o{ insight_cache : "punya"
  provinsi ||--o{ insight_cache : "punya"
```

**Alasan desain:**
- Simpan apa adanya dari BI per level — angka konsisten dengan bi.go.id
- Query bubble chart instant: `WHERE level = 0` atau `WHERE level = 1 AND provinsi_id = ?`
- `chk_level_fk` mencegah inconsistent state (mis. level=0 dengan pasar_id terisi)
- `UNIQUE NULLS NOT DISTINCT` (Postgres 15+) bikin upsert idempotent untuk semua level termasuk nasional
- `insight_cache.cache_date` eksplisit (bukan functional index) supaya kompatibel dengan Drizzle native
- Estimasi volume: ~21 komoditas × ~2000 entitas geografis × 365 hari ≈ 15jt row per tahun. Postgres handle ini dengan index yang benar.

---

## 4. Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                      SCRAPER (cron 07.00 WIB)           │
│                                                         │
│  GetCommoditiesTree ──→ upsert komoditas                │
│  GetDetailGridData2 ──→ parse level 0-3                 │
│                     ──→ upsert provinsi/kota/pasar      │
│                     ──→ upsert harga_harian             │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼ PostgreSQL
┌─────────────────────────────────────────────────────────┐
│                      API (Hono + Bun)                   │
│                                                         │
│  GET /komoditas          ← query harga_harian + aggregate
│  GET /komoditas/:id/historis ← query harga_harian       │
│  GET /komoditas/:id/detail   ← proxy GetDetailGridData2 │
│  GET /komoditas/:id/insight  ← check cache → LLM        │
│  GET /provinsi           ← query provinsi               │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼ REST JSON (V1) → tRPC (V2)
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js)                    │
│                                                         │
│  TanStack Query ──→ /komoditas ──→ D3 bubble chart      │
│  Klik bubble    ──→ /detail    ──→ tabel geografis      │
│                 ──→ /historis  ──→ chart historis        │
│                 ──→ /insight   ──→ LLM panel            │
│  harga_harian DB ──→ sparkline per komoditas          │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Kalkulasi Bubble

### 5.1 % Perubahan per Timeframe

```typescript
// Ambil harga pada tanggal target (atau terdekat sebelumnya yang ada di DB)
// untuk komoditas X pada level tertentu (0=nasional, 1=provinsi).
function getHargaTarget(
  komoditasId: number,
  level: 0 | 1,
  provinsiId: number | null,
  targetDate: Date,
): number {
  // SELECT harga FROM harga_harian
  // WHERE komoditas_id = komoditasId
  //   AND level = level
  //   AND (level = 0 OR provinsi_id = provinsiId)
  //   AND tanggal = (
  //     SELECT MAX(tanggal) FROM harga_harian
  //     WHERE komoditas_id = komoditasId
  //       AND level = level
  //       AND (level = 0 OR provinsi_id = provinsiId)
  //       AND tanggal <= targetDate
  //   )
}

function hitungPerubahan(hargaSekarang: number, hargaTarget: number): number {
  return ((hargaSekarang - hargaTarget) / hargaTarget) * 100
}

// Timeframe → offset hari
const TIMEFRAME_DAYS = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365 } as const
```

### 5.2 Threshold Volatilitas per Timeframe

Threshold disesuaikan dengan skala pergerakan tipikal harga pangan di tiap horizon waktu.
Konstanta tunggal di seluruh codebase, didefinisikan di `packages/shared/src/constants.ts`.

```typescript
export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y'

export const VOLATILITY_THRESHOLDS: Record<Timeframe, { stable: number; significant: number }> = {
  '1D': { stable: 0.5, significant: 2 },
  '1W': { stable: 2,   significant: 5 },
  '1M': { stable: 5,   significant: 10 },
  '3M': { stable: 10,  significant: 20 },
  '1Y': { stable: 15,  significant: 30 },
}
```

### 5.3 Warna Bubble (per timeframe)

```typescript
export function getBubbleColor(persen: number, timeframe: Timeframe): string {
  const { stable, significant } = VOLATILITY_THRESHOLDS[timeframe]
  if (Math.abs(persen) < stable / 5) return '#6b7280'  // abu — benar-benar stabil
  if (persen >=  significant) return '#ef4444'         // merah     — naik signifikan
  if (persen >   0)           return '#f97316'         // oranye    — naik biasa
  if (persen <= -significant) return '#22c55e'         // hijau tua — turun signifikan
  return '#84cc16'                                     // hijau muda — turun biasa
}
```

### 5.4 Ukuran Bubble (per timeframe, absolut)

Ukuran bubble dihitung **absolut terhadap threshold `significant`**, bukan relatif terhadap
max-of-day. Konsekuensi: di hari quiet semua bubble tampak kecil (sinyal visual yang jujur);
di hari volatile bubble membesar.

```typescript
const BUBBLE_MIN_RADIUS = 30   // px — minimum agar selalu kelihatan
const BUBBLE_MAX_RADIUS = 120  // px — capped saat |perubahan| >= significant

export function getBubbleRadius(persen: number, timeframe: Timeframe): number {
  const { significant } = VOLATILITY_THRESHOLDS[timeframe]
  const ratio = Math.min(Math.abs(persen) / significant, 1)
  return BUBBLE_MIN_RADIUS + ratio * (BUBBLE_MAX_RADIUS - BUBBLE_MIN_RADIUS)
}
```

### 5.5 Aksesibilitas

- **Arrow indicator** (↑/↓) di label bubble — jangan andalkan warna saja (deuteranopia/protanopia)
- **Tooltip teks** dengan angka eksplisit pada hover
- **Sparkline** hanya ditampilkan jika `radius >= 50px`. Bubble lebih kecil dari itu, sparkline tidak readable; pindahkan ke tooltip/hover.

---

## 6. LLM Integration

### 6.1 Prompt Template

```
Kamu adalah analis harga pangan Indonesia. Berikan analisis singkat dan praktis.

Data komoditas:
- Nama: {nama}
- Satuan: per {satuan}
- Jenis pasar: Tradisional
- Filter wilayah: {provinsi | "Nasional"}

Harga terkini:
- Hari ini: Rp {hargaHariIni}
- Kemarin: Rp {hargaKemarin}
- Perubahan: {perubahan}% ({arah})

Historis {n} hari terakhir:
{tanggal}: Rp {harga}
...

Berikan analisis dalam 4 paragraf singkat (masing-masing 2-3 kalimat):
1. Analisis pergerakan harga saat ini
2. Faktor-faktor penyebab (musim, hari raya, distribusi, cuaca, dll)
3. Outlook dan prediksi tren jangka pendek
4. Saran praktis untuk konsumen

Gunakan Bahasa Indonesia yang mudah dipahami masyarakat umum.
```

### 6.2 Cache Strategy

```
Cache key: komoditas_id + provinsi_id (null=nasional) + tanggal_hari_ini
TTL: expired tengah malam WIB (00:00 WIB)
Generate: on-demand saat modal dibuka, bukan pre-generate
```

---

## 7. Migration Path V1 → V2 (REST → tRPC)

Kunci migrasi mudah: **business logic dipisah dari route handler sejak V1**.

```typescript
// ✅ Cara yang benar (V1) — logic di service
// apps/api/src/services/komoditas.service.ts
export async function getAllKomoditas(provinsiId: number, timeframe: string) {
  // logic query DB di sini
}

// apps/api/src/routes/komoditas.ts
app.get('/', async (c) => {
  const data = await getAllKomoditas(0, '1D')  // delegate ke service
  return c.json(data)
})

// Migrasi V2 — tinggal wrap ke tRPC procedure:
// packages/trpc/src/routers/komoditas.ts
export const komoditasRouter = router({
  getAll: publicProcedure
    .input(z.object({ provinsiId: z.number(), timeframe: z.string() }))
    .query(({ input }) => getAllKomoditas(input.provinsiId, input.timeframe))
    // ↑ fungsi yang SAMA PERSIS dari service, tidak ada logic yang ditulis ulang
})
```

Estimasi waktu migrasi per route: **5–10 menit**.

---

## 8. Environment Variables

```bash
# apps/api
DATABASE_URL=postgresql://user:pass@host:5432/pantau_pangan
OPENROUTER_API_KEY=sk-or-...
API_PORT=3001

# apps/web
NEXT_PUBLIC_API_URL=http://localhost:3001        # development
NEXT_PUBLIC_API_URL=https://api.pantaupangan.id  # production
```
