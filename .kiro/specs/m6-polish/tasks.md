# Implementation Plan: M6 — Polish & Production Readiness

## Overview

Delapan area perbaikan cross-cutting tanpa fitur baru: light mode theming, cron scheduler,
retry adaptif, SEO/OG metadata, React Error Boundary, aksesibilitas halaman, aksesibilitas
modal, dan rate limiting LLM. Seluruh perubahan dilokalisasi ke file yang sudah ada atau
file baru yang terdaftar di design — tidak ada refactor lintas modul besar.

## Tasks

- [x] 1. Refactor `packages/scraper/src/index.ts` — ekstrak `runScraper()`
  - [x] 1.1 Ekstrak logika utama `main()` ke fungsi `runScraper(): Promise<ScraperResult>`
    - Pindahkan semua logika fetch, parse, upsert ke `runScraper()`
    - Definisikan dan ekspor interface `ScraperResult` (`rowsInserted`, `rowsUpserted`, `maxTanggal`, `durationMs`, `errors`)
    - `runScraper()` TIDAK boleh memanggil `process.exit()` — error fatal di-throw sebagai exception; `closeConnection()` tetap dipanggil sebelum throw
    - `main()` dipertahankan: panggil `runScraper()`, lalu `process.exit(0/1)` berdasarkan hasil — perilaku CLI tidak berubah
    - Hapus `void main()` di akhir file; ganti dengan guard `if (import.meta.main) { void main() }` agar tidak auto-run saat di-import dari scheduler
    - _Requirements: 2.2, 2.7_

  - [x] 1.2 Tulis unit test untuk `runScraper()` export
    - Test bahwa `runScraper()` mengembalikan objek dengan semua field `ScraperResult`
    - Test bahwa `main()` masih dapat dijalankan secara CLI (guard `import.meta.main`)
    - File: `packages/scraper/src/__tests__/index.test.ts`
    - _Requirements: 2.2_

- [x] 2. Implementasi Cron Scheduler — `apps/api/src/scheduler.ts`
  - [x] 2.1 Install dependency dan buat file `scheduler.ts`
    - Jalankan `bun add node-cron --filter=@pantau-pangan/api` dan `bun add -d @types/node-cron --filter=@pantau-pangan/api`
    - Buat `apps/api/src/scheduler.ts` dengan module-level state `let todayDone = false`
    - Implementasikan helper `getTodayWIB(): string` (YYYY-MM-DD UTC+7) — sama persis dengan yang ada di `insight.service.ts`
    - Ekspor `_resetTodayDone()` dan `_getTodayDone()` khusus untuk testing (prefixed `_`)
    - _Requirements: 2.1, 3.1_

  - [x] 2.2 Implementasikan `shouldRunScraper()` dan `runCronJob()`
    - Ekspor pure function `shouldRunScraper(todayDone: boolean, runNumber: 1 | 2 | 3): boolean` — return `!todayDone`; `runNumber` tidak mempengaruhi hasil
    - Implementasikan fungsi internal `runCronJob()`:
      - Cek `shouldRunScraper(todayDone, runNumber)` — jika false, log skip `{ skipped: true, reason: "data hari ini sudah tersedia" }` dan return
      - Panggil `await runScraper()` dari `@pantau-pangan/scraper`
      - Jika `result.maxTanggal === getTodayWIB()`, set `todayDone = true` dan log sukses dengan semua field result
      - Catch error: log error, lanjut tanpa exit
    - _Requirements: 2.3, 2.4, 2.7, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.3 Implementasikan `initScheduler()` dengan empat cron jobs
    - Ekspor `initScheduler(): void`
    - Daftarkan tiga schedule scrape: `"0 0 7 * * *"`, `"0 0 11 * * *"`, `"0 0 15 * * *"` — semua dengan `timezone: "Asia/Jakarta"` via node-cron
    - Daftarkan satu schedule reset midnight: `"0 0 0 * * *"` timezone Asia/Jakarta — set `todayDone = false` dan log reset
    - Gunakan `node-cron` dengan `scheduled: true` (auto-start)
    - _Requirements: 2.1, 2.8, 3.1_

  - [x] 2.4 Wire `initScheduler()` ke startup `apps/api/src/index.ts`
    - Import `initScheduler` dari `./scheduler`
    - Panggil `initScheduler()` setelah semua route di-mount dan sebelum `export default`
    - _Requirements: 2.1_

  - [x] 2.5 Tulis property test untuk `shouldRunScraper()`
    - **Property 1: `shouldRunScraper(todayDone, runNumber) === !todayDone` untuk semua kombinasi**
    - Gunakan `fc.boolean()` dan `fc.constantFrom(1 as const, 2 as const, 3 as const)`
    - Konfigurasi `numRuns: 100`
    - File: `apps/api/src/__tests__/scheduler.property.test.ts`
    - **Validates: Requirements 3.6**

  - [x] 2.6 Tulis unit test untuk `runCronJob()` behavior
    - Mock `runScraper` dari `@pantau-pangan/scraper`
    - Test: jika `todayDone = true` sebelum call, `runScraper` tidak dipanggil dan log skip ditulis
    - Test: jika `runScraper` return `maxTanggal === getTodayWIB()`, `_getTodayDone()` jadi `true`
    - Test: jika `runScraper` throw, error ditangkap dan `todayDone` tetap `false`
    - File: `apps/api/src/__tests__/scheduler.test.ts`
    - _Requirements: 2.3, 2.4, 2.7, 3.3, 3.4_

- [x] 3. Checkpoint — Verifikasi scheduler
  - Pastikan `bun test` di `apps/api` lulus semua test scheduler.
  - Pastikan `bun run typecheck` tidak ada error baru. Tanyakan jika ada pertanyaan sebelum lanjut.

- [x] 4. Implementasi Rate Limiter Middleware — `apps/api/src/middleware/rate-limiter.ts`
  - [x] 4.1 Buat file `rate-limiter.ts` dengan `inFlight` Map dan `extractIP()`
    - Buat `apps/api/src/middleware/rate-limiter.ts`
    - Deklarasikan module-level `const inFlight = new Map<string, number>()`
    - Ekspor pure function `extractIP(forwardedFor: string | undefined, realIP: string | undefined): string`
      - Ambil segmen pertama `X-Forwarded-For` (split koma, trim) jika ada dan non-empty
      - Fallback ke `realIP` jika truthy
      - Fallback ke string literal `"unknown"`
      - Hasil selalu trimmed dan non-empty
    - _Requirements: 8.2, 8.8_

  - [x] 4.2 Implementasikan middleware `rateLimiter` dengan cache-aware check
    - Ekspor `const rateLimiter: MiddlewareHandler`
    - Sebelum inkremen counter: lakukan DB lookup `insight_cache` (query `komoditasId`, `provinsiId`, `cacheDate = getTodayWIB()`) untuk cek cache hit
    - Jika cache hit: panggil `next()` langsung tanpa inkremen `inFlight`
    - Ekstrak IP via `extractIP(c.req.header('x-forwarded-for'), c.req.header('x-real-ip'))`
    - Jika `inFlight.get(ip) >= 1`: return `c.json({ error: "Terlalu banyak request. Coba lagi sesaat.", status: 429 }, 429)`
    - Else: `inFlight.set(ip, (inFlight.get(ip) ?? 0) + 1)`, lalu `try { await next() } finally { decrement & cleanup }`
    - Cleanup: jika count setelah dekrement `<= 0`, `inFlight.delete(ip)`, else `inFlight.set(ip, count - 1)`
    - _Requirements: 8.1, 8.3, 8.4, 8.5, 8.6, 8.8_

  - [x] 4.3 Mount `rateLimiter` di route `GET /komoditas/:id/insight`
    - Di `apps/api/src/routes/insight.ts`, import `rateLimiter` dari `../middleware/rate-limiter`
    - Tambahkan `rateLimiter` sebagai middleware sebelum handler: `app.get('/:id/insight', rateLimiter, async (c) => { ... })`
    - Cache check di middleware membutuhkan `komoditasId` dan `provinsiId` dari request — parse keduanya sebelum DB lookup di middleware menggunakan `c.req.param('id')` dan `c.req.query('provinsiId')`
    - _Requirements: 8.1_

  - [x] 4.4 Tulis property test untuk `extractIP()` dan simulasi `inFlight`
    - **Property 2: `extractIP()` selalu return non-empty trimmed string**
    - Gunakan `fc.option(fc.string(), { nil: undefined })` untuk kedua parameter
    - Verifikasi `result.length > 0` dan `result === result.trim()`
    - **Property 3: `inFlight` Map kembali ke size 0 setelah matched increment/decrement**
    - Simulasikan `fc.array(fc.record({ ip, count }))`, apply N increments lalu N decrements matching
    - Verifikasi `map.size === 0` setelah semua operasi selesai
    - Konfigurasi `numRuns: 100` untuk kedua property
    - File: `apps/api/src/__tests__/rate-limiter.property.test.ts`
    - **Property 2 Validates: Requirements 8.2**
    - **Property 3 Validates: Requirements 8.7**

  - [x] 4.5 Tulis unit test untuk `rateLimiter` middleware
    - Test: request pertama dari IP baru diteruskan (status bukan 429)
    - Test: request kedua saat IP sudah in-flight mendapat HTTP 429 dengan body JSON yang benar
    - Test: counter dekrement terjadi di `finally` block bahkan saat handler throw error
    - Test: IP di-remove dari Map setelah counter mencapai 0
    - Test: cache hit tidak menginkremen counter (mock DB return cached entry)
    - File: `apps/api/src/__tests__/rate-limiter.test.ts`
    - _Requirements: 8.3, 8.4, 8.5, 8.6_

- [x] 5. Checkpoint — Verifikasi backend lengkap
  - Pastikan `bun test` di `apps/api` lulus semua test (scheduler + rate limiter).
  - Pastikan `bun run typecheck` clean. Tanyakan jika ada pertanyaan sebelum lanjut.

- [x] 6. Implementasi `ErrorBoundary` — `apps/web/components/providers/error-boundary.tsx`
  - [x] 6.1 Buat React class component `ErrorBoundary`
    - Buat `apps/web/components/providers/error-boundary.tsx` dengan `'use client'` directive
    - Definisikan interface `ErrorBoundaryState { hasError: boolean; error: Error | null }`
    - Implementasikan `static getDerivedStateFromError(error: Error): ErrorBoundaryState`
    - Implementasikan `componentDidCatch(error: Error, info: React.ErrorInfo): void` — panggil `console.error(error, info.componentStack)`
    - Tambahkan komentar: "ErrorBoundary hanya menangkap error di render/lifecycle — tidak menangkap error di event handler atau async useEffect"
    - Fallback UI: centered container dengan (a) teks "Terjadi kesalahan yang tidak terduga." dalam Bahasa Indonesia, (b) instruksi "Muat ulang halaman untuk mencoba lagi.", (c) tombol "Muat Ulang Halaman" yang memanggil `window.location.reload()`
    - `render()`: jika `hasError`, return fallback; else return `this.props.children`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 6.2 Wrap aplikasi dengan `ErrorBoundary` di `apps/web/app/layout.tsx`
    - Import `ErrorBoundary` dari `@/components/providers/error-boundary`
    - Wrap `<QueryProvider>{children}</QueryProvider>` dengan `<ErrorBoundary>...</ErrorBoundary>` di dalam `<body>`
    - `ErrorBoundary` harus menjadi wrapper terluar di dalam `<body>` (di luar `QueryProvider`)
    - _Requirements: 5.1_

  - [x] 6.3 Tulis unit test untuk `ErrorBoundary`
    - Mount `ErrorBoundary` dengan child component yang throw error saat render
    - Assert fallback UI ditampilkan (teks Bahasa Indonesia dan tombol "Muat Ulang Halaman" ada di DOM)
    - Assert `console.error` dipanggil dengan `error` dan `componentStack`
    - File: `apps/web/__tests__/components/error-boundary.test.tsx`
    - _Requirements: 5.2, 5.3, 5.4, 5.6_

- [x] 7. Implementasi SEO & Open Graph Metadata — `apps/web/app/layout.tsx`
  - [x] 7.1 Perluas export `metadata` di `layout.tsx` dengan OG dan Twitter tags
    - Tambahkan `const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pantaupangan.id'`
    - Tambahkan `metadataBase: new URL(siteUrl)` ke objek `metadata`
    - Tambahkan blok `openGraph`: `title`, `description`, `url: siteUrl`, `type: 'website'`, `images: [{ url: '/og-image.png', width: 1200, height: 630 }]`
    - Tambahkan blok `twitter`: `card: 'summary_large_image'`, `title`, `description`, `images: ['/og-image.png']`
    - Tambahkan `alternates: { canonical: siteUrl }`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

  - [x] 7.2 Buat placeholder OG image `public/og-image.png`
    - Buat file `apps/web/public/og-image.png` berukuran 1200×630 piksel
    - Gunakan Node.js/Canvas atau buat file PNG solid dengan teks "Pantau Pangan" sebagai placeholder; file ini harus accessible via URL `/og-image.png`
    - Alternatif: buat dengan script sederhana menggunakan `sharp` atau buat SVG yang dikonversi — pilih yang paling mudah tanpa dependency baru
    - _Requirements: 4.3_

- [x] 8. Implementasi Light Mode Theming
  - [x] 8.1 Tambahkan `.bg-page-gradient` di `apps/web/app/globals.css`
    - Tambahkan di akhir file, di dalam `@layer components`:
      ```css
      @layer components {
        .bg-page-gradient {
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
    - CSS ini menggunakan `var(--color-background)` yang sudah terdefinisi di `@theme inline` di globals.css
    - _Requirements: 1.1_

  - [x] 8.2 Ganti hardcode colors di `apps/web/app/page.tsx`
    - `<main>`: ganti `bg-linear-to-b from-zinc-950 via-slate-950 to-black` → `bg-page-gradient`
    - `<h1>` judul "PANTAU PANGAN": ganti `text-white` → `text-foreground`
    - Tombol refresh: ganti `bg-zinc-900/80 border-white/10 text-zinc-300` → `bg-background/80 border-border text-muted-foreground`
    - Pastikan `hover:text-white hover:bg-zinc-800` di tombol refresh juga diganti → `hover:text-foreground hover:bg-muted`
    - _Requirements: 1.1, 1.2, 1.6_

  - [x] 8.3 Ganti hardcode colors di `apps/web/components/bubble-chart/bubble-tooltip.tsx`
    - Container `<div>`: ganti `bg-zinc-900/95` → `bg-popover`, `border-white/10` → `border-border`
    - `<p>` nama komoditas: ganti `text-white` → `text-popover-foreground`
    - `<p>` harga: ganti `text-zinc-300` → `text-muted-foreground`
    - `<p>` satuan "per kg": ganti `text-zinc-500` → `text-muted-foreground`
    - _Requirements: 1.3_

  - [x] 8.4 Ganti hardcode colors di `apps/web/components/theme-toggle.tsx`
    - `<button>`: ganti `bg-zinc-900/80 border-white/10 text-zinc-300` → `bg-background/80 border-border text-muted-foreground`
    - Ganti `hover:text-white hover:bg-zinc-800` → `hover:text-foreground hover:bg-muted`
    - _Requirements: 1.5_

- [x] 9. Implementasi Aksesibilitas Halaman — `apps/web/app/page.tsx`
  - [x] 9.1 Tambahkan skip link dan perbaiki semantic HTML
    - Tambahkan skip link sebagai elemen pertama sebelum `<main>` (sebagai sibling, bukan child):
      ```tsx
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:shadow-lg"
      >
        Lewati ke konten utama
      </a>
      ```
    - `<main>`: tambahkan `id="main-content"` dan `tabIndex={-1}`
    - Wrap `TimeframeFilter` + `SearchFilter` (desktop) dengan `<nav aria-label="Filter dan navigasi">` di dalam `<header>`
    - Wrap semua kontrol filter mobile (bottom dock) juga dengan `<nav aria-label="Filter dan navigasi">` yang terpisah atau gunakan satu `<nav>` dengan `aria-label` unik untuk versi mobile
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 10. Implementasi Aksesibilitas Modal — `aria-labelledby`
  - [x] 10.1 Tambahkan `id` eksplisit ke `DialogTitle` di `apps/web/components/modal/modal-header.tsx`
    - `ModalHeader` saat ini sudah menggunakan `<DialogTitle>` dari shadcn/ui — shadcn Dialog sudah menangani `role="dialog"` dan `aria-modal` via Radix UI
    - Tambahkan prop `id="komoditas-modal-title"` ke `<DialogTitle>` sehingga ada `id` eksplisit yang bisa di-reference
    - _Requirements: 7.4, 7.5_

  - [x] 10.2 Tambahkan `aria-labelledby` ke `<DialogContent>` di `apps/web/components/modal/komoditas-modal.tsx`
    - Tambahkan `aria-labelledby="komoditas-modal-title"` ke `<DialogContent>`
    - Catatan: Radix UI/shadcn `Dialog` sudah menyediakan `role="dialog"` dan `aria-modal="true"` secara otomatis; focus trap dan Escape key sudah di-handle
    - _Requirements: 7.4, 7.5_

- [x] 11. Final Checkpoint — Verifikasi seluruh M6
  - Jalankan `bun run typecheck` di root — pastikan 0 error TypeScript di semua packages.
  - Jalankan `bun test` di `apps/api` — semua test scheduler dan rate limiter lulus.
  - Jalankan `vitest --run` di `apps/web` — semua test error-boundary lulus.
  - Pastikan aplikasi dapat di-build tanpa error: `bun run build`.
  - Tanyakan jika ada pertanyaan sebelum dianggap selesai.

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk MVP lebih cepat
- `packages/scraper/src/index.ts` saat ini pakai `void main()` di akhir file dan `process.exit()` di dalam `main()` — task 1.1 harus refactor ini agar `runScraper()` aman diimport dari scheduler
- `modal-header.tsx` sudah pakai `<DialogTitle>` — Radix UI wires ini ke dialog label secara otomatis, tapi menambah `id` eksplisit + `aria-labelledby` pada `DialogContent` memberikan redundansi yang lebih eksplisit (task 10.1–10.2)
- Tailwind v4: jangan buat `tailwind.config.ts` — semua customization via `globals.css`
- `bg-page-gradient` dibuat via `@layer components` di `globals.css`, bukan via Tailwind config
- Cache-aware check di rate limiter (task 4.2) perlu parse `komoditasId` dan `provinsiId` dari request params/query sebelum DB lookup — gunakan parsing yang sama dengan route handler

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "6.1", "7.1", "8.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "6.2", "7.2", "8.2", "8.3", "8.4"] },
    { "id": 2, "tasks": ["2.2", "6.3", "9.1", "10.1"] },
    { "id": 3, "tasks": ["2.3", "4.1", "10.2"] },
    { "id": 4, "tasks": ["2.4", "2.5", "2.6", "4.2"] },
    { "id": 5, "tasks": ["4.3", "4.4", "4.5"] }
  ]
}
```
