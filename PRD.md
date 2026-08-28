# PRD — Pantau Pangan

> Visualisasi harga pangan strategis nasional berbasis bubble chart interaktif

**Version:** 1.9  
**Status:** M6b Dashboard Layout Done — Ready for M7 Deploy  
**Stack finalized:** ✅

> **Branding:** Nama project resmi adalah **Pantau Pangan**. "Gelembung" boleh dipakai sebagai tagline visual (mis. _"Pantau Pangan — gelembung harga pangan strategis"_), tapi semua nama folder, package, database, dan domain pakai `pantau-pangan` / `pantaupangan.id`.

---

## 1. Latar Belakang

Harga pangan strategis di Indonesia berfluktuasi setiap hari dan berdampak langsung pada daya beli masyarakat. Data ini tersedia secara publik di PIHPS (Pusat Informasi Harga Pangan Strategis Nasional) milik Bank Indonesia, namun disajikan dalam format tabel yang tidak intuitif.

**Pantau Pangan** terinspirasi dari [CryptoBubbles](https://cryptobubbles.net/) — menyajikan data harga pangan dalam bentuk bubble chart interaktif yang mudah dipahami sekilas, dilengkapi analisis LLM ketika bubble diklik.

---

## 2. Tujuan Produk

- Menyajikan pergerakan harga 21 komoditas pangan strategis secara visual dan intuitif
- Memberikan insight berbasis LLM per komoditas ketika diklik
- Mengakumulasi data historis harian yang tidak tersedia di sumber aslinya
- Menjadi referensi publik yang mudah diakses siapa saja

---

## 3. Target Pengguna

- Masyarakat umum yang ingin memantau harga pangan
- Jurnalis / peneliti yang butuh gambaran cepat tren harga
- Pelaku usaha kecil yang bergantung pada harga komoditas

---

## 4. Scope V1

### 4.1 In Scope

- Bubble chart 21 komoditas dari data BI PIHPS
- Filter timeframe: 1D / 1W / 1M / 3M / 1Y (graceful degradation)
- Filter provinsi
- Search komoditas
- Dark / light mode
- Modal detail per komoditas (chart historis + tabel geografis + LLM insight)
- Cron scraper harian, akumulasi historis di DB
- Deploy public

### 4.2 Out of Scope (V1)

- Auth / user system
- Notifikasi harga
- Filter jenis pasar (v1 fix: Pasar Tradisional)
- Komparasi antar komoditas
- Export data
- tRPC (masuk V2)
- Peta choropleth

---

## 5. Data Source

**Sumber:** Bank Indonesia — PIHPS Nasional  
**URL:** https://www.bi.go.id/hargapangan  
**Auth:** Semua endpoint public, tidak butuh session/cookie

### 5.1 Komoditas (21 leaf, 10 kategori)

| Kategori      | Komoditas                                                          |
| ------------- | ------------------------------------------------------------------ |
| Beras         | Kualitas Bawah I, Bawah II, Medium I, Medium II, Super I, Super II |
| Daging Ayam   | Daging Ayam Ras Segar                                              |
| Daging Sapi   | Kualitas 1, Kualitas 2                                             |
| Telur Ayam    | Telur Ayam Ras Segar                                               |
| Bawang Merah  | Bawang Merah Ukuran Sedang                                         |
| Bawang Putih  | Bawang Putih Ukuran Sedang                                         |
| Cabai Merah   | Cabai Merah Besar, Cabai Merah Keriting                            |
| Cabai Rawit   | Cabai Rawit Hijau, Cabai Rawit Merah                               |
| Minyak Goreng | Minyak Goreng Curah, Kemasan Bermerk 1, Kemasan Bermerk 2          |
| Gula Pasir    | Gula Pasir Kualitas Premium, Gula Pasir Lokal                      |

### 5.2 Endpoint yang Dipakai

| Endpoint                                                      | Kegunaan                                                            | Keterangan                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| `GetCommoditiesTree`                                          | Master komoditas + hierarki kategori                                | Seed DB, jarang berubah                     |
| `GetDetailGridData2?ComId=&ProvId=&PriceTypeId=1&isPasokan=1` | Harga 5 hari terakhir, breakdown nasional → provinsi → kota → pasar | Scraper harian + modal detail + konteks LLM |

**Endpoint yang tidak dipakai:**

| Endpoint                  | Alasan                                                    |
| ------------------------- | --------------------------------------------------------- |
| `GetHistogramData`        | Skip — data sudah cukup dari `GetDetailGridData2`         |
| `GetType`                 | Hardcode `PriceTypeId=1` (Pasar Tradisional)              |
| `GetProvinceAll`          | List provinsi diambil dari `GetDetailGridData2` (level 1) |
| `GetDummyMarkerForLegend` | UI legend peta BI, tidak relevan                          |

**Parameter fix di semua request:**

- `PriceTypeId=1` → Pasar Tradisional
- `isPasokan=1`

### 5.3 Flow Data per Fitur

```
Bubble chart utama
├── Ukuran + warna     ← % perubahan dihitung dari harga_harian DB (per timeframe)
└── Sparkline         ← harga_harian DB (akumulasi harian dari scraper)

Modal detail (klik bubble)
├── Chart historis     ← harga_harian DB (akumulasi harian)
├── Tabel geografis    ← GetDetailGridData2 (selalu live dari BI)
└── LLM insight        ← dibangun dari data DB + cache insight_cache
```

### 5.4 Struktur Data Geografis

```
Nasional (level 0)
└── Provinsi (level 1) — 34 provinsi
    └── Kota/Kabupaten (level 2)
        └── Pasar (level 3)
```

> **Catatan provinsi:** BI PIHPS belum mengikuti pemekaran wilayah Papua terbaru. Per Mei 2026, data BI hanya mengenal **34 provinsi** dengan Papua direpresentasikan sebagai _Papua_ dan _Papua Barat_ saja. Aplikasi mengikuti taksonomi BI apa adanya (sumber data adalah single source of truth) — tidak melakukan mapping/split sendiri ke provinsi pemekaran.

---

## 6. Fitur Detail

### 6.1 Halaman Utama — Dashboard

Layout dashboard grid (M6b) — bukan full-screen chart polos. Chart tetap dominan, chrome dikelola sebagai zona terpisah:

```
┌────────────────────────────────────────────────────────┐
│ TopBar (glass) — logo · omnisearch · refresh · mode     │
├────────────────────────────────────────────────────────┤
│ MarketBar — ● Live · data {tgl} · {tgl} · provinsi      │
├──────────┬─────────────────────────────┬───────────────┤
│ Legend   │ Bubble chart (D3)           │ Ringkasan      │
│ Panel    │ + floating dock timeframe   │ Sidebar        │
│ (lg+)    │                             │ (lg+)          │
├──────────┴─────────────────────────────┴───────────────┤
│ DataFooter — sumber · akumulasi sejak                   │
└────────────────────────────────────────────────────────┘
```

**Zona layout:**

- **TopBar** (glass `backdrop-blur`): logo + wordmark, omnisearch, refresh manual, toggle dark/light
- **MarketBar**: indikator "Live" (pulsing dot), rentang tanggal data terbaru, filter provinsi
- **LegendPanel** (kiri, `lg+`): legenda warna per timeframe + badge data points
- **RingkasanSidebar** (kanan, `lg+`): verdict pasar, bar proporsi, Top Movers — lihat detail di bawah
- **Floating dock**: filter timeframe melayang di bawah canvas — satu sumber untuk semua breakpoint (mobile & desktop)
- **DataFooter**: strip sumber data

**Bubble chart:**

- Setiap bubble = satu komoditas
- **Ukuran bubble** = proporsional terhadap `|% perubahan|` yang dinormalisasi terhadap **threshold `significant` per timeframe** (lihat 6.4). Hari quiet → semua bubble kecil; hari volatile → bubble membesar. Ada minimum size agar bubble terkecil tetap kelihatan.
- **Warna bubble** (threshold per timeframe — lihat 6.4; definisi warna sinyal lengkap di `DESIGN.md`):
  - Hijau tua → turun ≥ `significant`
  - Hijau muda → turun antara 0 dan `significant`
  - Abu → stabil (|perubahan| < `stable / 5`)
  - Oranye → naik antara 0 dan `significant`
  - Merah → naik ≥ `significant`
- **Indikator arah:** arrow (↑/↓) di label setiap bubble — aksesibilitas color-blind, jangan andalkan warna saja.
- **Label bubble:** nama singkat komoditas + arrow + % perubahan
- **Sparkline** di dalam bubble — hanya ditampilkan jika `radius >= 50px`. Bubble lebih kecil dari itu, sparkline tidak readable; pindah ke tooltip/hover saja.
- Search: highlight ring (`stroke white`) di bubble yang match + dim non-match (`opacity 0.2`)
- Animasi fisika (bubble melayang, bisa di-drag)

**RingkasanSidebar (verdict panel):**

- **Verdict headline**: "Pasar didominasi kenaikan/penurunan — {naik}/{total} naik"
- **Bar proporsi**: segmen naik/turun/stabil memakai signal colors — ini data volatilitas, bukan dekorasi (Signal Quarantine Rule, `DESIGN.md`)
- **Top Movers**: daftar komoditas dengan pergerakan terbesar (urut |%|), klik item → buka modal komoditas
- Agregat dihitung dari `summarizeBubbles()` di `apps/web/lib/summary-utils.ts`

**Controls:**

- **Filter timeframe:** 1D / 1W / 1M / 3M / 1Y — floating dock di bawah canvas. Mengubah basis perhitungan % perubahan **dan** threshold warna/ukuran. Setiap tombol menampilkan badge data points (`1Y · 12d`) saat data belum mencapai durasi penuh.
- **Filter provinsi:** dropdown di MarketBar — default: Semua Provinsi (nasional)
- **Search komoditas:** omnisearch di TopBar — highlight bubble yang match
- **Toggle dark/light mode** di TopBar
- **Refresh manual** di TopBar — re-fetch data terbaru

**Footer informasi data (M6b):**

- **DataFooter**: "Sumber: Bank Indonesia · PIHPS" + "Akumulasi sejak {tanggal_pertama}"
- **MarketBar**: "● Live" + "data {tanggal_terbaru} · {tanggal_pertama}"
- `jam_scrape` tidak lagi ditampilkan — digantikan indikator Live + rentang tanggal di MarketBar. Transparansi data tetap terjaga lewat dua tempat ini.

### 6.2 Filter Timeframe — Graceful Degradation

% perubahan dihitung sebagai:

```
perubahan = (harga_hari_ini - harga_pada_tanggal_target) / harga_pada_tanggal_target × 100

tanggal_target = tanggal terdekat yang tersedia di DB ≤ (hari_ini - durasi_timeframe)
```

Kalau data belum cukup, pakai data tertua yang ada — tidak error, tidak kosong. Mirip asset baru listing di TradingView.

| Filter | Durasi   | Hari pertama deploy                        |
| ------ | -------- | ------------------------------------------ |
| 1D     | 1 hari   | ✅ Langsung bisa                           |
| 1W     | 7 hari   | ⚠️ Pakai 5 hari yang ada (badge `1W · 5d`) |
| 1M     | 30 hari  | ⚠️ Pakai 5 hari yang ada (badge `1M · 5d`) |
| 3M     | 90 hari  | ⚠️ Pakai 5 hari yang ada (badge `3M · 5d`) |
| 1Y     | 365 hari | ⚠️ Pakai 5 hari yang ada (badge `1Y · 5d`) |

Semakin lama project berjalan, semakin akurat tiap timeframe. Saat data points >= durasi penuh, badge hilang (atau jadi check ✓).

### 6.4 Threshold Volatilitas per Timeframe

Threshold ditentukan per timeframe karena pergerakan harga pangan punya skala berbeda di tiap horizon waktu:

| Timeframe | `stable` | `significant` |
| --------- | -------- | ------------- |
| 1D        | 0.5%     | 2%            |
| 1W        | 2%       | 5%            |
| 1M        | 5%       | 10%           |
| 3M        | 10%      | 20%           |
| 1Y        | 15%      | 30%           |

**Aturan klasifikasi (untuk warna & ukuran):**

- `|perubahan| < stable / 5` → abu (benar-benar stabil)
- `|perubahan| ∈ [stable/5, significant)` → hijau muda (turun) / oranye (naik)
- `|perubahan| >= significant` → hijau tua (turun) / merah (naik)
- Ukuran bubble: `radius = MIN + clamp(|perubahan| / significant, 0..1) × (MAX - MIN)`

Konstanta ini didefinisikan di `packages/shared/src/constants.ts` sebagai `VOLATILITY_THRESHOLDS`.

### 6.3 Modal Detail (klik bubble / item Top Movers)

Terinspirasi dari panel CryptoBubbles. Dibuka dari klik bubble di chart ATAU klik item di Top Movers (RingkasanSidebar). Struktur **tabs Overview / Insight** (M6b):

**Header (muncul di semua tab):**

- Nama komoditas lengkap
- Harga hari ini (Rp X.XXX/kg)
- % perubahan sesuai timeframe aktif (dengan warna + arrow)

**Tab Overview:**

- **Selector timeframe:** buttons 1D / 1W / 1M / 3M / 1Y — default 1D, reset ke 1D setiap ganti komoditas
- **Chart Historis:**
  - Line chart dari data yang terakumulasi di DB
  - Hari pertama deploy: 5 hari
  - Makin lama project jalan, makin panjang chartnya
  - Tandai titik harga tertinggi dan terendah
- **Tabel Geografis:**
  - Data dari `GetDetailGridData2` (selalu 5 hari terakhir, real-time dari BI)
  - Tree collapsible: Nasional → Provinsi → Kota → Pasar
  - 5 kolom tanggal
  - Sortable by harga

**Tab Insight:**

- **LLM Insight Panel:**
  - Generate on-demand ketika **tab Insight dibuka** (bukan saat modal dibuka — TanStack Query `enabled` di-mount bersama tab)
  - Di-cache per komoditas per provinsi per hari
  - Bahasa Indonesia
  - Output di-render sebagai **markdown** (komponen `InsightContent`)
  - Timeout 35s → fallback UI "Insight tidak tersedia saat ini" + tombol "Coba lagi"

**Konteks yang dikirim ke LLM:**

```
Komoditas : {nama}
Satuan    : per Kg
Pasar     : Tradisional

Harga hari ini  : Rp {harga}
Harga kemarin   : Rp {hargaKemarin}
Perubahan 1 hari: {perubahan1D}%

Historis tersedia ({n} hari):
{tanggal1} - Rp {harga1}
{tanggal2} - Rp {harga2}
...

Filter aktif : {namaProvinsi / "Semua Provinsi"}
```

**Output LLM (4 paragraf singkat):**

1. Analisis pergerakan harga
2. Faktor penyebab (musim, hari raya, distribusi, cuaca)
3. Outlook / tren ke depan
4. Saran praktis untuk konsumen

---

## 7. Tech Stack

### 7.1 Monorepo Structure

```
pantau-pangan/                ← root
├── apps/
│   ├── api/                  ← Hono.js + Bun
│   └── web/                  ← Next.js
└── packages/
    ├── shared/               ← types, utils, constants
    └── scraper/              ← Bun fetch (zero dependency)
```

**Tooling:** Turborepo + Bun workspaces

### 7.2 Backend — `apps/api`

- **Runtime:** Bun 1.x (port 3001)
- **Framework:** Hono.js 4.x
- **ORM:** Drizzle ORM (M2+)
- **Database:** PostgreSQL 15+ (M2+)
- **LLM:** General Compute (primary) → OpenRouter fallback (M6b — lihat §11)
- **Cron:** Bun native scheduler

### 7.3 Frontend — `apps/web`

- **Framework:** Next.js 16.x App Router (port 3000)
- **React:** 19.x
- **Visualisasi:** D3.js (force simulation, dipasang di M4)
- **UI Components:** shadcn/ui (dipasang di M4 lewat `bunx shadcn@latest`)
- **Styling:** Tailwind CSS v4 (zero-config, customize via `app/globals.css` `@theme` block)
- **Data Fetching:** TanStack Query (dipasang di M4)
- **Theme:** Dark / Light mode (shadcn built-in, M4)
- **Design system (M6b):** design token di `app/globals.css` (`@theme`) — brand accent padi-green + signal colors + typography Geist Sans/Mono. Source of truth visual: **`DESIGN.md`** di root. Signal colors hanya untuk data volatilitas (Signal Quarantine Rule).
- **Config:** `next.config.ts` (TS native, Next 15+) dengan `transpilePackages: ['@pantau-pangan/shared']`

### 7.4 Scraper — `packages/scraper`

- **Runtime:** Bun fetch native — zero dependency, no Playwright, no axios/ky/node-fetch
- **Jadwal:** Cron 07.00 / 11.00 / 15.00 WIB dengan retry adaptif (lihat §10) — BI update setiap hari termasuk weekend
- **Request per run:** 21 request (1 per komoditas via `GetDetailGridData2`)
- **Idempotent:** Upsert berbasis `UNIQUE NULLS NOT DISTINCT` di `harga_harian` — aman dijalankan ulang

### 7.5 Shared — `packages/shared`

- Leaf package — TIDAK depend ke workspace lain
- Dual export ESM: `main`/`types`/`exports."."` di `package.json`
- Build via `tsc -p tsconfig.build.json` → `dist/index.{js,d.ts}` (consumer butuh build sebelum import)
- Types: `Komoditas`, `HargaHarian`, `BubbleData`, `InsightResponse` (M2+)
- Utils: kalkulasi % perubahan, normalisasi bubble size, warna bubble (M2+)
- Constants: endpoint BI, `VOLATILITY_THRESHOLDS`, daftar timeframe (M2+)

### 7.6 Code Quality (M1 — sudah aktif)

- **TypeScript 6.x** strict mode (`strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, dll). Base config di root `tsconfig.json`, semua package extends.
- **Turborepo 2.x** untuk pipeline `build`/`typecheck`/`lint`/`dev`/`scrape` dengan caching.
- **ESLint 10.x flat config** single source di root (`eslint.config.js`). Tidak ada per-package config. Pakai `tseslint.config()` helper + typed-linting di-scope ke `**/*.{ts,tsx,mts,cts}`.
- **Prettier 3.x** + `eslint-config-prettier` (Prettier menang untuk formatting).
- **Husky 9.x** + lint-staged + commitlint:
  - `pre-commit` → `bunx lint-staged` (ESLint --fix + Prettier --write pada staged files)
  - `commit-msg` → `bunx commitlint --edit` (Conventional Commits enforce)
  - `pre-push` → `bun run typecheck` (full monorepo typecheck)

### 7.7 Deploy

- **Frontend:** Vercel (Next.js akan build dengan Node.js runtime — itu transparan)
- **Backend + Database:** Railway (PostgreSQL + Hono API di Bun runtime, satu project)

### 7.8 Migration Path V1 → V2

- V1: REST JSON — fetch biasa dari TanStack Query ke Hono
- V2: tRPC — service functions sudah dipisah dari route handler sejak V1, migrasi tinggal wrap ke procedure

---

## 8. Database Schema

```sql
-- Master data
komoditas     (id, tree_id, com_id, nama, kategori, satuan)
provinsi      (id, nama)
kota          (id, provinsi_id, nama)
pasar         (id, kota_id, nama)

-- Fact table — simpan SEMUA level dari BI (0=nasional, 1=provinsi, 2=kota, 3=pasar)
-- Alasan: BI sudah expose angka level 0 & 1 langsung di GetDetailGridData2.
-- Re-aggregate sendiri akan beda hasil + lebih lambat. Kita simpan apa adanya.
harga_harian  (id, komoditas_id, level, provinsi_id NULL, kota_id NULL, pasar_id NULL,
               harga, tanggal)

-- LLM cache
insight_cache (id, komoditas_id, provinsi_id NULL, cache_date, insight, generated_at)
```

**Index:**

- `harga_harian(komoditas_id, level, tanggal DESC)` — query bubble chart per-level
- `harga_harian(komoditas_id, level, provinsi_id, tanggal DESC)` — query filter provinsi
- `insight_cache(komoditas_id, provinsi_id, cache_date)` — cache lookup

**Detail constraint & query** ada di `docs/architecture.md` section 3.

**Query timeframe (level nasional):**

```sql
-- Cari harga komoditas X pada tanggal target (atau terdekat sebelumnya)
SELECT harga FROM harga_harian
WHERE komoditas_id = :id
  AND level = 0                       -- nasional
  AND tanggal = (
    SELECT MAX(tanggal) FROM harga_harian
    WHERE komoditas_id = :id
      AND level = 0
      AND tanggal <= :target_date
  )
```

---

## 9. API Endpoints (V1 REST)

| Method | Path                      | Kegunaan                                                         |
| ------ | ------------------------- | ---------------------------------------------------------------- |
| `GET`  | `/komoditas`              | List semua komoditas + harga terbaru + % perubahan per timeframe |
| `GET`  | `/komoditas/:id/historis` | Historis harga dari DB untuk chart modal                         |
| `GET`  | `/komoditas/:id/detail`   | Tabel geografis 5 hari (proxy `GetDetailGridData2`)              |
| `GET`  | `/komoditas/:id/insight`  | LLM insight (return cache atau generate baru)                    |
| `GET`  | `/provinsi`               | List semua provinsi                                              |

**Query params:**

- `?provinsiId=0` — filter provinsi (default: 0 = semua)
- `?timeframe=1D` — timeframe untuk % perubahan (default: 1D)

---

## 10. Scraper Flow

```
Cron harian (07.00 WIB) — dengan retry adaptif:

1. Fetch GetCommoditiesTree
   └── Upsert master komoditas ke DB

2. Untuk setiap 21 komoditas:
   └── Fetch GetDetailGridData2
       ├── Parse semua baris (level 0–3)
       ├── Upsert master provinsi / kota / pasar kalau baru
       ├── Ambil 5 kolom tanggal → upsert ke harga_harian (semua level)
       └── (hari pertama deploy: dapat 5 hari gratis sekaligus)

3. Verifikasi hasil:
   ├── Cek MAX(tanggal) yang baru di-upsert
   ├── Jika MAX(tanggal) == hari ini WIB → sukses, log dan selesai
   └── Jika MAX(tanggal) < hari ini → BI belum update, schedule retry

4. Retry schedule (idempotent — upsert, jadi aman dijalankan ulang):
   ├── Run #1: 07.00 WIB (primary)
   ├── Run #2: 11.00 WIB (jika #1 belum dapat hari ini)
   ├── Run #3: 15.00 WIB (jika #2 belum dapat hari ini)
   └── Stop retry jika sudah dapat hari ini, atau setelah run #3

5. Log structured per run: jumlah row baru, jumlah upsert, tanggal terbaru,
   durasi, daftar error per komoditas (kalau ada).
```

**Alasan retry adaptif:** Waktu update BI tidak deterministik (didokumentasikan di `docs/api-reference.md`). Cron tunggal jam 07.00 berisiko menangkap data kemarin saja. Karena upsert idempotent, run berulang tidak menimbulkan duplikasi — overhead-nya minim (3 × 21 request paling buruk per hari).

---

## 11. LLM Integration

**Provider chain (M6b):** **General Compute** (`minimax-m2.7`) sebagai primary → **OpenRouter** (`nvidia/nemotron-3-ultra-550b-a55b:free`) sebagai fallback. Jika primary error/timeout, otomatis fallback; jika keduanya gagal → 502.

- Env: `GENERALCOMPUTE_API_KEY` + `GENERALCOMPUTE_MODEL` (default `minimax-m2.7`), `OPENROUTER_API_KEY` + `OPENROUTER_MODEL` (default `nvidia/nemotron-3-ultra-550b-a55b:free`)
- Timeout per request: 30 detik (AbortController)
- Parsing respons diperkuat: fallback `content` → `reasoning`, handle JSON invalid/kosong

**Cache strategy:**

- 1 cache entry per komoditas × provinsi × hari kalender
- TTL: expired saat tengah malam WIB
- Generate on-demand (tidak pre-generate semua)

**Rate limiting:** 1 concurrent LLM request per IP (in-memory `Map<string, number>`, cache-aware — cache hit melewati counter)

---

## 12. Milestones V1

| Milestone                  | Status  | Deliverable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1 — Foundation**        | ✅ Done | Monorepo Bun + Turborepo 2, TypeScript 6 strict, ESLint 10 flat config (idiomatic typescript-eslint v8 dengan `tseslint.config()` helper), Prettier 3, Husky 9 + lint-staged + commitlint, 4 package skeleton (`apps/api` Hono, `apps/web` Next 16 + Tailwind 4 + React 19, `packages/shared`, `packages/scraper`), 4 hook gate verified                                                                                                                                                                                                                                                                                                             |
| **M2 — Scraper**           | ✅ Done | Drizzle schema (6 tabel), migration, shared types/constants/utils, fetcher (retry + backoff), parser, orchestrator (upsert idempotent), 40 property tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **M3 — API**               | ✅ Done | Hono routes + services: `/komoditas` (bubble data), `/komoditas/:id/historis`, `/komoditas/:id/detail` (proxy BI), `/komoditas/:id/insight` (LLM + cache), `/provinsi`. Thin route handler → service layer architecture, error handler, validators, 78 tests (property + integration)                                                                                                                                                                                                                                                                                                                                                                |
| **M4 — Bubble Chart**      | ✅ Done | D3.js force simulation, warna + ukuran bubble per timeframe, label 2-baris scaling, sparkline dalam bubble, filter timeframe (disable graceful), filter provinsi, search komoditas, tooltip hover, dark/light mode, refresh manual, loading skeleton, error state, DataFooter, 62 tests                                                                                                                                                                                                                                                                                                                                                              |
| **M5 — Modal Detail**      | ✅ Done | Modal detail per komoditas: Chart_Historis (D3.js line chart + HighLowMarker), Tabel_Geografis collapsible 4 level (sortable), Insight_Panel LLM (auto-fetch, cache-aware, timeout 35s), 107 tests (property + unit)                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **M6 — Polish**            | ✅ Done | Light mode theming (CSS variable tokens menggantikan hardcode zinc/dark), cron scheduler `node-cron` (07/11/15 WIB + midnight reset + retry adaptif `todayDone`), SEO/OG metadata (`metadataBase`, `openGraph`, `twitter`, `canonical`) + `og-image.png` 1200×630, React `ErrorBoundary` class component (fallback UI Bahasa Indonesia + reload button), aksesibilitas halaman (skip link, `<main id="main-content">`, `<nav aria-label>`), aksesibilitas modal (`aria-labelledby`), rate limiter LLM in-memory per IP (cache-aware, `finally` cleanup), 3 property tests + 22 unit/integration tests baru                                           |
| **M6b — Dashboard Layout** | ✅ Done | Refactor layout halaman utama ke grid dashboard: TopBar glass (logo + omnisearch + refresh + theme toggle), MarketBar (indikator Live + rentang tanggal + filter provinsi), LegendPanel (kiri), RingkasanSidebar (kanan — verdict + bar proporsi + Top Movers via `summarizeBubbles`), floating dock timeframe (mobile & desktop), modal detail diubah ke tabs Overview/Insight + render markdown insight, design token padi-green (Signal Quarantine Rule di `DESIGN.md`), logo baru, perbaikan tampilan mobile (bubble chart, market bar, modal), LLM provider chain General Compute → OpenRouter fallback, `DESIGN.md` + `PRODUCT.md` ditambahkan |
| **M7 — Deploy**            | Pending | Railway (API + DB) + Vercel (Web), cron aktif, monitoring log                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

> Detail spec M1 ada di `.kiro/specs/m1-foundation/`. Untuk milestone berikutnya, asumsikan tooling M1 sudah stabil dan jangan setup ulang — lihat `CLAUDE.md` section "State M1 Foundation" untuk daftar versi tooling yang ter-resolve.

---

## 13. Open Questions

- [x] BI update data setiap hari termasuk weekend → cron jalan 7 hari seminggu
- [x] Bubble size: proporsional terhadap volatilitas (% perubahan absolut), dengan minimum size agar selalu kelihatan
- [x] Aggregation level: simpan apa adanya dari BI (level 0/1/2/3), tidak re-aggregate
- [x] Threshold warna & ukuran: per-timeframe (lihat 6.4)
- [x] Cold start UX: badge data points di tombol timeframe, tidak disable
- [x] Branding: "Pantau Pangan" sebagai nama resmi
- [x] Provinsi: BI belum mengikuti pemekaran Papua — tetap 34 provinsi (Papua & Papua Barat). Ikuti taksonomi BI apa adanya.
- [x] Cron timing: retry adaptif 07.00 / 11.00 / 15.00 WIB, stop kalau sudah dapat data hari ini (lihat §10)
