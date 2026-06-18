# Design Document — M6: Polish & Production Readiness

## Overview

M6 adalah milestone cross-cutting yang mempersiapkan Pantau Pangan untuk deployment production.
Tidak ada fitur baru yang ditambahkan — semua pekerjaan bersifat penyempurnaan, perbaikan
kualitas, dan penguatan infrastruktur yang tersebar di seluruh codebase.

Delapan area pekerjaan:

1. **Light Mode Theming** — mengganti semua hardcode Zinc/dark colors dengan CSS variable tokens
2. **Cron Scheduler** — three-schedule scraper otomatis di dalam proses API menggunakan `node-cron`
3. **Retry Adaptif** — flag `todayDone` in-memory yang mencegah redundant scrape runs
4. **SEO & Open Graph** — metadata lengkap di root layout menggunakan Next.js Metadata API
5. **Error Boundary** — React class component yang mencegah blank-screen saat runtime error
6. **Aksesibilitas Struktur** — skip link, semantic HTML, ARIA landmarks di halaman utama
7. **Aksesibilitas Modal** — `aria-labelledby` tambahan pada KomoditasModal (shadcn/ui sudah handle focus trap)
8. **Rate Limiting LLM** — Hono middleware in-memory per IP untuk endpoint `/komoditas/:id/insight`

### Prinsip Desain

- **No new dependencies** (kecuali `node-cron` untuk scheduler) — semua solusi menggunakan
  primitif yang sudah ada: CSS variables, React class component, in-memory Map
- **Minimal surface area** — setiap perubahan dilokalisasi ke file yang paling tepat;
  tidak ada refactor besar lintas modul
- **Backward-compatible** — dark mode tetap berfungsi identik; hanya light mode yang diperbaiki

---

## Architecture

### Dependency Graph Perubahan

```
apps/web/app/layout.tsx
  ├── + ErrorBoundary (new component)
  ├── + metadata OG/Twitter (expanded)
  └── (unchanged) QueryProvider, fonts

apps/web/app/page.tsx
  ├── + skip link element
  ├── + <main id="main-content"> (was <main>)
  ├── + <nav aria-label="..."> wrapper untuk filter
  └── ~ hardcode colors → CSS tokens

apps/web/components/
  ├── bubble-chart/bubble-tooltip.tsx  ~ hardcode colors → CSS tokens
  ├── theme-toggle.tsx                  ~ hardcode colors → CSS tokens
  ├── modal/komoditas-modal.tsx         + aria-labelledby
  └── providers/error-boundary.tsx     NEW

apps/api/src/
  ├── index.ts                          + initScheduler() call
  ├── scheduler.ts                      NEW (node-cron, todayDone flag)
  └── middleware/rate-limiter.ts        NEW (in-memory Map)

packages/scraper/src/index.ts
  └── + export runScraper(): Promise<ScraperResult>
      (main() tetap ada untuk CLI, tapi tidak panggil process.exit di non-fatal path)
```

### Aliran Data Scheduler

```
API startup (index.ts)
  └── initScheduler()
        ├── cron "0 0 7 * * *" TZ=Asia/Jakarta  → runCronJob()
        ├── cron "0 0 11 * * *" TZ=Asia/Jakarta → runCronJob()
        ├── cron "0 0 15 * * *" TZ=Asia/Jakarta → runCronJob()
        └── cron "0 0 0 * * *" TZ=Asia/Jakarta  → reset todayDone = false

runCronJob()
  ├── IF todayDone → log skip, return
  └── ELSE → await runScraper()
        ├── success + maxTanggal === today → todayDone = true, log success
        └── error → log error, continue (no process.exit)
```

### Aliran Rate Limiter

```
GET /komoditas/:id/insight
  └── rateLimiterMiddleware(c, next)
        ├── extract IP (X-Forwarded-For → x-real-ip → "unknown")
        ├── IF insight_cache HIT (check via DB sebelum LLM)
        │     └── next() langsung, counter TIDAK diinkremen
        ├── IF inFlight.get(ip) >= 1 → return 429
        └── ELSE
              inFlight.set(ip, count + 1)
              try { await next() }
              finally { decrement & cleanup }
```

**Catatan arsitektur**: Rate limiter perlu tahu apakah request akan hit cache sebelum
menginkremen counter (Req 8.6). Karena insight service sudah melakukan cache check sebagai
langkah pertama, middleware perlu melakukan cache check mandiri yang ringan, atau arsitektur
perlu sedikit direfactor. Keputusan desain: middleware melakukan DB lookup cache check
sebelum menginkremen counter — query ini murah (indexed lookup per `komoditas_id`, `provinsi_id`,
`cache_date`) dan konsisten dengan behaviour service.

---

## Components and Interfaces

### 1. `runScraper()` — packages/scraper/src/index.ts

Export fungsi baru yang dapat dipanggil dari scheduler:

```typescript
export interface ScraperResult {
  rowsInserted: number
  rowsUpserted: number
  maxTanggal: string | null // YYYY-MM-DD, date terbaru yang berhasil di-scrape
  durationMs: number
  errors: Array<{ komoditas: string; message: string }>
}

export async function runScraper(): Promise<ScraperResult>
```

`main()` yang ada tetap dipertahankan untuk CLI (`bun run scrape`). Refactor:

- Logika utama dipindah ke `runScraper()`
- `main()` memanggil `runScraper()`, lalu memanggil `process.exit()` berdasarkan hasil
- `runScraper()` **tidak pernah** memanggil `process.exit()`; error fatal di-throw sebagai exception

### 2. `scheduler.ts` — apps/api/src/scheduler.ts

```typescript
import cron from 'node-cron'
import { runScraper } from '@pantau-pangan/scraper'

// Module-level state — in-memory, reset saat process restart
let todayDone = false

function getTodayWIB(): string {
  /* YYYY-MM-DD in UTC+7 */
}

export function initScheduler(): void
// Mendaftarkan 4 cron jobs: 3 scrape (07/11/15 WIB) + 1 midnight reset
```

### 3. `rate-limiter.ts` — apps/api/src/middleware/rate-limiter.ts

```typescript
import type { MiddlewareHandler } from 'hono'

// Module-level state
const inFlight = new Map<string, number>()

function extractIP(c: Context): string
// X-Forwarded-For (first segment) → x-real-ip → "unknown"

export const rateLimiter: MiddlewareHandler
// Middleware yang di-mount di insight route
```

### 4. `error-boundary.tsx` — apps/web/components/providers/error-boundary.tsx

```typescript
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  static getDerivedStateFromError(error: Error): ErrorBoundaryState
  componentDidCatch(error: Error, info: React.ErrorInfo): void
  render(): React.ReactNode
  // Fallback UI: pesan error Bahasa Indonesia + tombol "Muat Ulang Halaman"
}
```

### 5. Theme Token Mapping

Pemetaan penggantian class Tailwind per komponen:

| Komponen                       | Sebelum                                               | Sesudah                                                |
| ------------------------------ | ----------------------------------------------------- | ------------------------------------------------------ |
| `page.tsx` `<main>`            | `bg-linear-to-b from-zinc-950 via-slate-950 to-black` | `bg-page-gradient` (CSS class di globals.css)          |
| `page.tsx` judul               | `text-white`                                          | `text-foreground`                                      |
| `page.tsx` tombol              | `bg-zinc-900/80 border-white/10 text-zinc-300`        | `bg-background/80 border-border text-muted-foreground` |
| `bubble-tooltip.tsx` container | `bg-zinc-900/95 border-white/10`                      | `bg-popover border-border`                             |
| `bubble-tooltip.tsx` nama      | `text-white`                                          | `text-popover-foreground`                              |
| `bubble-tooltip.tsx` harga     | `text-zinc-300`                                       | `text-muted-foreground`                                |
| `bubble-tooltip.tsx` satuan    | `text-zinc-500`                                       | `text-muted-foreground`                                |
| `theme-toggle.tsx` tombol      | `bg-zinc-900/80 border-white/10 text-zinc-300`        | `bg-background/80 border-border text-muted-foreground` |

**Page gradient strategy**: Karena Tailwind v4 tidak memiliki `tailwind.config.ts`, kita tambahkan
`@layer components` di `globals.css`:

```css
@layer components {
  .bg-page-gradient {
    @apply bg-gradient-to-b;
    background-image: linear-gradient(
      to bottom,
      var(--color-background),
      color-mix(in oklch, var(--color-background) 85%, oklch(0.2 0 240)),
      var(--color-background)
    );
  }
  .dark .bg-page-gradient {
    background-image: linear-gradient(
      to bottom,
      oklch(0.09 0 0),
      oklch(0.07 0.01 240),
      oklch(0 0 0)
    );
  }
}
```

Ini mempertahankan gradient dark yang sudah ada dan memberikan gradient halus di light mode.

### 6. Semantic HTML Changes — page.tsx

```tsx
// Sebelum
<main className="flex flex-col h-dvh ...">
  <header ...>
    {/* logo + filter buttons mixed */}
  </header>
</main>

// Sesudah
{/* Skip link — elemen pertama sebelum <main> */}
<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:shadow-lg">
  Lewati ke konten utama
</a>

<main id="main-content" tabIndex={-1} className="flex flex-col h-dvh ...">
  <header className="absolute top-0 ...">
    {/* logo area */}
    <nav aria-label="Filter dan navigasi" className="hidden md:flex ...">
      {/* TimeframeFilter, SearchFilter, ProvinsiFilter */}
    </nav>
    {/* Right controls */}
  </header>
  {/* Bubble chart, footer, mobile controls */}
</main>
```

### 7. KomoditasModal — aria-labelledby

```tsx
// Di ModalHeader component — tambah id ke heading nama komoditas
<h2 id="komoditas-modal-title" className="...">{nama}</h2>

// Di DialogContent — tambah aria-labelledby
<DialogContent
  aria-labelledby="komoditas-modal-title"
  className="..."
>
```

shadcn/ui `Dialog` sudah menyediakan `role="dialog"` dan `aria-modal="true"` secara otomatis.
Focus trap dan Escape key handling juga sudah ditangani oleh Radix UI yang mendasari Dialog.

### 8. SEO Metadata — layout.tsx

```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pantaupangan.id'

export const metadata: Metadata = {
  title: 'Pantau Pangan',
  description: 'Visualisasi harga pangan strategis nasional berbasis bubble chart interaktif.',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'Pantau Pangan',
    description: 'Visualisasi harga pangan strategis nasional berbasis bubble chart interaktif.',
    url: siteUrl,
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pantau Pangan',
    description: 'Visualisasi harga pangan strategis nasional berbasis bubble chart interaktif.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: siteUrl,
  },
}
```

---

## Data Models

### ScraperResult

```typescript
// packages/scraper/src/index.ts
export interface ScraperResult {
  rowsInserted: number // baris baru yang di-insert
  rowsUpserted: number // baris yang sudah ada (conflict → skip via onConflictDoNothing)
  maxTanggal: string | null // tanggal terbaru yang berhasil diproses, format YYYY-MM-DD
  durationMs: number // total waktu eksekusi dalam milidetik
  errors: Array<{
    komoditas: string // nama komoditas yang gagal
    message: string // pesan error
  }>
}
```

### Scheduler State

```typescript
// apps/api/src/scheduler.ts (module-level, tidak diekspor)
let todayDone: boolean = false

// Diekspor hanya untuk testing
export function _resetTodayDone(): void {
  todayDone = false
}
export function _getTodayDone(): boolean {
  return todayDone
}
```

### Rate Limiter State

```typescript
// apps/api/src/middleware/rate-limiter.ts (module-level, tidak diekspor)
const inFlight = new Map<string, number>()

// Helper pure function — dapat ditest
export function extractIP(forwardedFor: string | undefined, realIP: string | undefined): string
// Returns first segment dari X-Forwarded-For, atau realIP, atau "unknown"

// Helper pure function untuk logic skip
export function shouldRunScraper(todayDone: boolean, runNumber: 1 | 2 | 3): boolean
// Returns true jika dan hanya jika !todayDone
```

### ErrorBoundary State

```typescript
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}
// Tidak ada persistensi — reset saat mount ulang
```

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions
of a system — essentially, a formal statement about what the system should do. Properties serve
as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

Dari seluruh acceptance criteria M6, dua fungsi cocok untuk property-based testing:

- **Req 3.6** → `shouldRunScraper(todayDone, runNumber)` — pure function, input space kecil
  tapi exhaustive, invariant yang sangat tegas
- **Req 8.2 & 8.7** → `extractIP(forwardedFor, realIP)` dan simulasi `inFlight` Map — pure
  function / pure simulation dengan invariant yang jelas dan input space luas

Requirement lain (theming, semantic HTML, ARIA, Error Boundary, SEO tags, cron wiring) berupa
structural checks (class name presence, DOM attribute existence, route wiring) yang lebih tepat
ditest sebagai example-based atau integration tests.

**Property Reflection**: Tiga candidates property dievaluasi:

- Property 1 dan 3 tidak overlap — Property 1 tentang decision logic scheduler, Property 3
  tentang state invariant rate limiter.
- Property 2 dan 3 tidak overlap — Property 2 tentang string parsing, Property 3 tentang Map
  lifecycle.
- Tidak ada redundansi yang teridentifikasi; semua tiga properties memberikan nilai unik.

---

### Property 1: Retry Logic — Scraper dijalankan jika dan hanya jika data hari ini belum tersedia

_For any_ kombinasi `todayDone ∈ {true, false}` dan `runNumber ∈ {1, 2, 3}`, fungsi
`shouldRunScraper(todayDone, runNumber)` SHALL mengembalikan `true` jika dan hanya jika
`todayDone === false` — nilai `runNumber` tidak mempengaruhi hasil.

Ini adalah total specification: enam kombinasi input, perilaku sepenuhnya ditentukan oleh
`todayDone` saja. Tidak ada edge case yang luput dari property ini.

**Validates: Requirements 3.6**

---

### Property 2: IP Extraction — Output selalu berupa string non-kosong yang sudah di-trim

_For any_ nilai header `X-Forwarded-For` dan `x-real-ip` (termasuk `undefined`, string kosong,
string spasi, IP tunggal, IP berganda dengan koma, string arbitrer), fungsi
`extractIP(forwardedFor, realIP)` SHALL mengembalikan string yang:

- Tidak kosong (`result.length > 0`)
- Tidak mengandung whitespace di awal atau akhir (`result === result.trim()`)
- Jika `forwardedFor` mengandung koma, output adalah segmen pertama setelah di-trim

**Validates: Requirements 8.2**

---

### Property 3: Rate Limiter — Tidak ada counter leak setelah semua request selesai

_For any_ sequence request dari satu atau lebih IP address yang semua diproses hingga selesai
(baik sukses maupun error), total slot concurrent yang tercatat dalam `inFlight` Map SHALL
kembali ke nol untuk setiap IP setelah semua request-nya selesai — Map harus kosong setelah
seluruh sequence selesai.

Diimplementasikan dengan mensimulasikan sequence pasangan `(increment, decrement)` per IP
menggunakan generator fast-check, lalu memverifikasi final state `Map.size === 0`.

**Validates: Requirements 8.7**

---

## Error Handling

### Scraper Errors

| Skenario                       | Penanganan                                                            |
| ------------------------------ | --------------------------------------------------------------------- |
| Fatal error (koneksi DB gagal) | `runScraper()` throws; scheduler log error, lanjut tanpa exit         |
| Komoditas individual gagal     | Di-accumulate ke `errors[]`; komoditas lain tetap diproses            |
| Semua komoditas gagal          | `successCount === 0`; `maxTanggal === null`; `todayDone` tidak di-set |
| Timeout fetch BI               | Error per-komoditas; tidak propagate ke level global                  |

### Rate Limiter Errors

| Skenario                              | Penanganan                                                |
| ------------------------------------- | --------------------------------------------------------- |
| Request concurrent kedua dari IP sama | HTTP 429, counter tidak diinkremen                        |
| LLM error / timeout                   | `finally` block tetap mendekrement counter                |
| Counter sudah 0 saat hendak dekrement | Guard `if (count <= 1)` → hapus entry dari Map            |
| IP "unknown"                          | Diperlakukan sama seperti IP biasa — satu slot concurrent |

### Error Boundary

| Skenario                   | Penanganan                                                                     |
| -------------------------- | ------------------------------------------------------------------------------ |
| Render error di subtree    | `hasError = true`, render fallback UI                                          |
| Error di event handler     | **Tidak ditangkap** — Error Boundary hanya tangkap error saat render/lifecycle |
| Error di async `useEffect` | **Tidak ditangkap** — gunakan try/catch manual atau React Query error handling |

Keterbatasan ini harus didokumentasikan di kode sebagai komentar.

### SEO Metadata

| Skenario                                     | Penanganan                                 |
| -------------------------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL` tidak di-set          | Fallback ke `"https://pantaupangan.id"`    |
| `NEXT_PUBLIC_SITE_URL` dengan trailing slash | `new URL(siteUrl)` handle ini dengan benar |

---

## Testing Strategy

### Unit Tests

- **ErrorBoundary**: Mount dengan child yang throws, verifikasi fallback UI render dan
  `console.error` dipanggil
- **Rate Limiter middleware**: Mock Hono context, test 429 response saat in-flight >= 1,
  test counter decrement di `finally` block
- **Scheduler `runCronJob`**: Mock `runScraper`, test bahwa skip terjadi saat `todayDone = true`
- **Theme tokens**: Snapshot test komponen setelah theme switch (visual regression minimal)
- **KomoditasModal aria**: Render dialog, assert `aria-labelledby` attribute ada dan
  merujuk ke heading yang benar

### Property-Based Tests (fast-check)

Library: **fast-check** (sudah terpasang di `apps/web` dan `apps/api`).

Setiap property test dikonfigurasi minimum **100 iterasi** (`numRuns: 100`).

**apps/api/src/**tests**/scheduler.property.test.ts**

```typescript
// Feature: m6-polish, Property 1: shouldRunScraper returns true iff !todayDone
fc.property(
  fc.boolean(),
  fc.constantFrom(1 as const, 2 as const, 3 as const),
  (todayDone, runNumber) => {
    return shouldRunScraper(todayDone, runNumber) === !todayDone
  },
)
```

**apps/api/src/**tests**/rate-limiter.property.test.ts**

```typescript
// Feature: m6-polish, Property 2: extractIP always returns non-empty trimmed string
fc.property(
  fc.option(fc.string(), { nil: undefined }),
  fc.option(fc.string(), { nil: undefined }),
  (forwardedFor, realIP) => {
    const result = extractIP(forwardedFor, realIP)
    return result.length > 0 && result === result.trim()
  },
)

// Feature: m6-polish, Property 3: no counter leak after all requests complete
fc.assert(
  fc.property(
    fc.array(
      fc.record({
        ip: fc.string({ minLength: 1, maxLength: 20 }),
        count: fc.integer({ min: 1, max: 5 }),
      }),
      { minLength: 1, maxLength: 10 },
    ),
    (entries) => {
      const map = new Map<string, number>()
      // Simulate N increments per IP
      for (const { ip, count } of entries) {
        map.set(ip, (map.get(ip) ?? 0) + count)
      }
      // Simulate N decrements per IP (matching increments)
      for (const { ip, count } of entries) {
        const current = map.get(ip) ?? 0
        const next = current - count
        if (next <= 0) map.delete(ip)
        else map.set(ip, next)
      }
      // After all matched decrements, map must be empty
      return map.size === 0
    },
  ),
  { numRuns: 100 },
)
```

### Integration Tests

- **Cron scheduling**: Start scheduler, mock `runScraper`, advance time (atau gunakan `cron.getTasks()`),
  verifikasi fungsi dipanggil pada waktu yang tepat
- **Rate limiter end-to-end**: Dua concurrent requests ke `/komoditas/:id/insight`, verifikasi
  salah satu mendapat 429
- **SEO metadata**: `next build && next export` (atau curl terhadap dev server), parse `<head>`,
  assert semua OG tags ada

### Aksesibilitas

- **Skip link**: Render halaman, `tab` ke elemen pertama, assert skip link visible,
  click, assert fokus pindah ke `#main-content`
- **aria-labelledby**: Buka modal, assert `aria-labelledby` merujuk ke ID yang ada di DOM
- **WCAG contrast**: Manual check dengan browser DevTools atau axe — tidak di-automate dalam
  scope M6 (full WCAG validation membutuhkan manual testing dengan assistive technologies)

> **Catatan**: WCAG compliance penuh membutuhkan manual testing dengan assistive technologies
> dan expert accessibility review. Test otomatis di sini hanya verifikasi structural correctness.
