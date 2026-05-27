# Implementation Plan: M4 Bubble Chart Frontend

## Overview

Membangun halaman utama Pantau Pangan — bubble chart interaktif yang memvisualisasikan pergerakan harga 21 komoditas pangan strategis nasional. Implementasi mencakup setup infrastruktur frontend (TanStack Query, shadcn/ui), data fetching layer, D3.js force simulation, filter controls, tooltip, dan loading/error states.

Semua kode ditulis dalam TypeScript di `apps/web/`. Gunakan `bun add` untuk semua dependency — jangan edit `package.json` manual.

## Tasks

- [x] 1. Install dependencies dan setup testing framework
  - Jalankan: `bun add d3 @tanstack/react-query --filter=@pantau-pangan/web`
  - Jalankan: `bun add -d @types/d3 --filter=@pantau-pangan/web`
  - Jalankan: `bun add -d fast-check --filter=@pantau-pangan/web`
  - Jalankan: `bun add -d vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom --filter=@pantau-pangan/web`
  - Buat `apps/web/vitest.config.ts` — konfigurasi vitest dengan `@vitejs/plugin-react`, environment `jsdom`, dan path alias `@/` → `./`
  - Tambahkan script `"test": "vitest"` ke `apps/web/package.json` via `bun pkg set scripts.test="vitest" --filter=@pantau-pangan/web`
  - Tambahkan task `test` ke `turbo.json` (dependsOn: `["^build"]`, outputs: `[]`)
  - _Requirements: 1.1, 2.1, 2.2, 2.4_

- [x] 2. Setup shadcn/ui
  - Jalankan `bunx shadcn@latest init` di `apps/web/` — pilih style default, kompatibel Tailwind v4 zero-config (tanpa `tailwind.config.ts`)
  - Jika init menghasilkan `eslint.config.js` atau `tailwind.config.ts` di dalam `apps/web/`, hapus file tersebut — andalkan root flat config dan Tailwind v4 zero-config
  - Jalankan `bunx shadcn@latest add button select badge` di `apps/web/`
  - Verifikasi komponen tersedia di `apps/web/components/ui/`
  - _Requirements: 1.3_

- [x] 3. Buat QueryProvider dan setup TanStack Query di layout
  - [x] 3.1 Buat `apps/web/components/providers/query-provider.tsx`
    - Tambahkan `'use client'` directive
    - Buat `QueryClient` dengan `defaultOptions.queries: { staleTime: 30_000, retry: 2 }`
    - Wrap children dengan `QueryClientProvider`
    - _Requirements: 1.1, 1.2, 1.4, 2.5_

  - [x] 3.2 Modifikasi `apps/web/app/layout.tsx`
    - Import `QueryProvider` dari `components/providers/query-provider.tsx`
    - Wrap `{children}` dengan `<QueryProvider>` — `layout.tsx` tetap server component, hanya `QueryProvider` yang `'use client'`
    - _Requirements: 1.1, 1.4_

- [x] 4. Buat API client
  - [x] 4.1 Buat `apps/web/lib/api-client.ts`
    - Definisikan `API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'`
    - Buat helper `apiFetch<T>(path: string): Promise<T>` — throw `Error` jika `!res.ok` dengan pesan `API error: ${res.status} ${res.statusText}`
    - Implementasikan `fetchKomoditas(timeframe: Timeframe, provinsiId: number): Promise<BubbleData[]>`
    - Implementasikan `fetchProvinsi(): Promise<Provinsi[]>`
    - Implementasikan `fetchHistorisKomoditas(komoditasId: number, provinsiId: number): Promise<HargaHarian[]>`
    - Import types dari `@pantau-pangan/shared` — jangan duplikasi
    - _Requirements: 1.5, 2.1, 2.2, 2.4, 2.6_

  - [x] 4.2 Tulis unit tests untuk API client
    - Test `apiFetch` melempar error saat response tidak ok (status 4xx/5xx)
    - Test `fetchKomoditas` membangun URL dengan query params `timeframe` dan `provinsiId` yang benar
    - Test fallback ke `http://localhost:3001` saat `NEXT_PUBLIC_API_URL` tidak di-set
    - _Requirements: 1.5, 2.6_

- [x] 5. Buat custom TanStack Query hooks
  - [x] 5.1 Buat `apps/web/lib/hooks/use-komoditas.ts`
    - Implementasikan `useKomoditas(timeframe: Timeframe, provinsiId: number)`
    - `queryKey: ['komoditas', timeframe, provinsiId]`
    - `queryFn: () => fetchKomoditas(timeframe, provinsiId)`
    - `staleTime: 30_000`, `retry: 2`
    - Return `{ data, isLoading, isError, isRefetching, refetch }`
    - _Requirements: 2.1, 2.3, 2.5_

  - [x] 5.2 Buat `apps/web/lib/hooks/use-provinsi.ts`
    - Implementasikan `useProvinsi()`
    - `queryKey: ['provinsi']`
    - `staleTime: 5 * 60_000`, `retry: 2`
    - _Requirements: 2.2_

  - [x] 5.3 Buat `apps/web/lib/hooks/use-historis-komoditas.ts`
    - Implementasikan `useHistorisKomoditas(komoditasId: number | null, provinsiId: number)`
    - `queryKey: ['historis', komoditasId, provinsiId]`
    - `enabled: komoditasId !== null`
    - `staleTime: 60_000`, `retry: 2`
    - _Requirements: 2.4_

  - [x] 5.4 Tulis property test untuk query key uniqueness (Property 8)
    - **Property 8: Query Key Uniqueness**
    - **Validates: Requirements 2.3**
    - Gunakan `fc.record({ timeframe: fc.constantFrom('1D','1W','1M','3M','1Y'), provinsiId: fc.integer({ min: 0, max: 34 }) })` untuk generate dua pasang parameter berbeda
    - Assert bahwa `JSON.stringify(key1) !== JSON.stringify(key2)` untuk setiap pasang yang berbeda
    - Minimum 100 iterasi

  - [x] 5.5 Tulis unit tests untuk hooks
    - Test `useKomoditas` melakukan refetch otomatis saat `timeframe` atau `provinsiId` berubah (verifikasi via `queryKey` yang berbeda)
    - Test `useHistorisKomoditas` tidak aktif (`enabled: false`) saat `komoditasId` adalah `null`
    - _Requirements: 2.3, 2.4_

- [x] 6. Buat filter components
  - [x] 6.1 Buat `apps/web/components/filters/timeframe-filter.tsx`
    - Tambahkan `'use client'` directive
    - Render 5 tombol `1D`, `1W`, `1M`, `3M`, `1Y` menggunakan shadcn/ui `Button`
    - Tombol aktif mendapat visual state berbeda (variant `default`, tombol lain `outline`)
    - Tampilkan `Data_Badge` (shadcn/ui `Badge`) di tombol aktif jika `dataBadge[timeframe] !== null && dataBadge[timeframe] < TIMEFRAME_DAYS[timeframe]` — format: `"1W · 5d"`, termasuk `"1W · 0d"` jika nol
    - Props: `{ value: Timeframe, onChange: (tf: Timeframe) => void, dataBadge?: Record<Timeframe, number | null> }`
    - Import `TIMEFRAME_DAYS` dari `@pantau-pangan/shared`
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 6.2 Buat `apps/web/components/filters/provinsi-filter.tsx`
    - Tambahkan `'use client'` directive
    - Gunakan shadcn/ui `Select` component
    - Opsi pertama: "Semua Provinsi" dengan value `"0"`
    - Isi opsi dari `useProvinsi()` hook — tampilkan disabled state dengan placeholder "Memuat provinsi..." saat `isLoading`
    - Props: `{ value: number, onChange: (provinsiId: number) => void }`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 6.3 Tulis property test untuk filter state independence (Property 7)
    - **Property 7: Filter State Independence**
    - **Validates: Requirements 6.4, 7.6**
    - Generate urutan operasi acak yang mencampur `setTimeframe` dan `setProvinsiId`
    - Assert bahwa perubahan `provinsiId` tidak mengubah `timeframe` dan sebaliknya
    - Minimum 100 iterasi

  - [x] 6.4 Tulis property test untuk data badge display logic (Property 6)
    - **Property 6: Data Badge Display Logic**
    - **Validates: Requirements 6.3**
    - Buat fungsi pure `formatDataBadge(timeframe: Timeframe, actualDays: number): string | null`
    - Generate `fc.record({ timeframe: fc.constantFrom(...), actualDays: fc.nat() })`
    - Assert: jika `actualDays < TIMEFRAME_DAYS[timeframe]` → return string mengandung timeframe dan `actualDays`; jika `actualDays >= TIMEFRAME_DAYS[timeframe]` → return `null`
    - Minimum 100 iterasi

  - [x] 6.5 Tulis unit tests untuk filter components
    - Test `TimeframeFilter` memanggil `onChange` dengan timeframe yang benar saat tombol diklik
    - Test `ProvinsiFilter` menampilkan disabled state saat `isLoading`
    - Test badge muncul saat `actualDays < TIMEFRAME_DAYS[timeframe]` dan hilang saat sudah penuh
    - _Requirements: 6.1, 6.2, 6.3, 7.3, 7.4_

- [x] 7. Buat BubbleChart component dengan D3 force simulation
  - [x] 7.1 Buat `apps/web/lib/bubble-utils.ts`
    - Implementasikan `clampBubblePosition(x: number, y: number, radius: number, width: number, height: number): { x: number, y: number }`
    - Clamp: `x = Math.max(radius, Math.min(width - radius, x))`, sama untuk y
    - Export fungsi ini — akan dipakai oleh BubbleChart dan property tests
    - _Requirements: 3.7_

  - [x] 7.2 Tulis property test untuk bubble position clamping (Property 3)
    - **Property 3: Bubble Position Clamping Invariant**
    - **Validates: Requirements 3.7**
    - Generate `fc.float({ min: 100, max: 2000 })` untuk width/height, `fc.float({ min: 30, max: 120 })` untuk radius, `fc.float({ min: -1000, max: 3000 })` untuk rawX/rawY
    - Assert: hasil `x ∈ [radius, width - radius]` dan `y ∈ [radius, height - radius]`
    - Minimum 100 iterasi

  - [x] 7.3 Buat `apps/web/components/bubble-chart/bubble-chart.tsx`
    - Tambahkan `'use client'` directive
    - Props: `{ data: BubbleData[], isRefetching?: boolean, width: number, height: number, onBubbleHover: (bubble: BubbleData | null, x: number, y: number) => void }`
    - Definisikan `SimulationNode extends BubbleData` dengan field `x, y, vx, vy, fx, fy`
    - Gunakan `useRef<SVGSVGElement>` dan `useRef<d3.Simulation<SimulationNode, undefined> | null>`
    - Setup D3 force simulation di `useEffect([data, width, height])`:
      - `forceCenter(width/2, height/2)`
      - `forceCollide(d => d.radius + 2)`
      - `forceManyBody().strength(-30)`
    - Preserve posisi x/y dari node sebelumnya jika `komoditasId` sama (cegah teleport saat data update)
    - Pada setiap tick: clamp posisi via `clampBubblePosition`, update DOM langsung via `d3.select` (bukan React state) untuk performa 60fps
    - Transisi animasi 400ms via `d3.transition().duration(400)` saat data berubah
    - Cleanup: `simulation.stop()` di return function `useEffect`
    - Render `<svg role="img" aria-label={...}>` — aria-label format: `"Bubble chart harga pangan — ${data.length} komoditas, timeframe ${timeframe}"`
    - Render `<circle>` per komoditas dengan `aria-label` format: `"${nama}: Rp ${harga.toLocaleString('id-ID')}/kg, ${perubahan > 0 ? 'naik' : 'turun'} ${Math.abs(perubahan).toFixed(1)}%"`
    - Saat `isRefetching`, tambahkan `opacity-50` overlay pada SVG container
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 4.4, 4.5, 8.2_

  - [x] 7.4 Tambahkan label rendering ke BubbleChart
    - Render `<text>` di dalam setiap bubble hanya jika `radius >= 40`
    - Label berisi: nama singkat komoditas (truncate jika perlu), Arrow_Indicator (`↑` jika `perubahan > 0`, `↓` jika `perubahan < 0`), persentase format `↑2.3%`
    - Jika `color === '#6b7280'` (stabil), tampilkan label tanpa Arrow_Indicator
    - Posisi teks: `text-anchor="middle"`, `dominant-baseline="middle"` di tengah bubble
    - _Requirements: 4.1, 4.2, 4.3, 4.6_

  - [x] 7.5 Tulis property test untuk bubble rendering fidelity (Property 1)
    - **Property 1: Bubble Rendering Fidelity**
    - **Validates: Requirements 3.1, 3.2**
    - Generate `fc.array(fc.record({ komoditasId: fc.nat(), nama: fc.string(), kategori: fc.string(), harga: fc.float({ min: 1000, max: 100000 }), perubahan: fc.float({ min: -50, max: 50 }), radius: fc.float({ min: 30, max: 120 }), color: fc.constantFrom('#6b7280','#ef4444','#f97316','#22c55e','#84cc16') }), { minLength: 1, maxLength: 21 })`
    - Render BubbleChart dengan data tersebut, assert setiap `<circle>` memiliki `r` = `radius` dan `fill` = `color` dari data yang sesuai
    - Minimum 100 iterasi

  - [x] 7.6 Tulis property test untuk label conditional rendering (Property 2)
    - **Property 2: Label Conditional Rendering**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.6**
    - Generate `BubbleData` dengan variasi `radius` (di bawah dan di atas 40) dan `perubahan` (positif, negatif, nol) dan `color` (termasuk `#6b7280`)
    - Assert: radius >= 40 + perubahan > 0 → label mengandung `↑`; radius >= 40 + perubahan < 0 → label mengandung `↓`; color === `#6b7280` → label tidak mengandung `↑` atau `↓`; radius < 40 → tidak ada elemen `<text>` untuk bubble tersebut
    - Minimum 100 iterasi

  - [x] 7.7 Tulis property test untuk aria-label completeness (Property 9)
    - **Property 9: Aria Label Completeness**
    - **Validates: Requirements 4.5**
    - Generate `BubbleData` arbitrary
    - Assert bahwa `aria-label` pada `<circle>` mengandung nama komoditas, nilai harga diformat Rupiah, dan persentase perubahan
    - Minimum 100 iterasi

- [x] 8. Buat BubbleTooltip component
  - [x] 8.1 Buat `apps/web/lib/tooltip-utils.ts`
    - Implementasikan `calculateTooltipPosition(bubbleX: number, bubbleY: number, viewportWidth: number, viewportHeight: number, tooltipWidth: number, tooltipHeight: number): { x: number, y: number }`
    - Posisi default: offset kanan-bawah dari bubble
    - Jika melampaui tepi kanan: geser ke sisi kiri bubble
    - Jika melampaui tepi bawah: geser ke sisi atas bubble
    - Clamp final: `x >= 0`, `x + tooltipWidth <= viewportWidth`, `y >= 0`, `y + tooltipHeight <= viewportHeight`
    - _Requirements: 5.5_

  - [x] 8.2 Tulis property test untuk tooltip viewport containment (Property 5)
    - **Property 5: Tooltip Viewport Containment**
    - **Validates: Requirements 5.5**
    - Generate `fc.record({ bubbleX: fc.float({ min: 0, max: 2000 }), bubbleY: fc.float({ min: 0, max: 1200 }), viewportWidth: fc.float({ min: 300, max: 3000 }), viewportHeight: fc.float({ min: 300, max: 2000 }) })`
    - Assert: `tooltipX >= 0`, `tooltipX + TOOLTIP_WIDTH <= viewportWidth`, `tooltipY >= 0`, `tooltipY + TOOLTIP_HEIGHT <= viewportHeight`
    - Minimum 100 iterasi

  - [x] 8.3 Buat `apps/web/components/bubble-chart/bubble-tooltip.tsx`
    - Tambahkan `'use client'` directive
    - Props: `{ bubble: BubbleData | null, x: number, y: number, provinsiId: number }`
    - Render sebagai `div` absolut di luar SVG (bukan elemen SVG) — posisi via inline style `left` dan `top` dari `calculateTooltipPosition`
    - Tampilkan: nama lengkap komoditas, harga diformat `Rp ${harga.toLocaleString('id-ID')}/kg`, persentase dengan Arrow_Indicator dan warna sesuai `color`, satuan komoditas
    - Jika `bubble.radius >= 50`: render komponen `Sparkline` (mini line chart dari `useHistorisKomoditas`) — lebar 120px, tinggi 40px
    - Jika `bubble.radius < 50`: tampilkan teks saja tanpa Sparkline
    - Jika `useHistorisKomoditas` gagal: tampilkan tooltip tanpa sparkline (graceful degradation)
    - Muncul/hilang dengan CSS transition — `opacity-0` → `opacity-100` dalam < 100ms, hilang dalam < 150ms
    - Render `null` jika `bubble === null`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 8.4 Tulis property test untuk tooltip sparkline threshold (Property 4)
    - **Property 4: Tooltip Sparkline Threshold**
    - **Validates: Requirements 5.2, 5.3**
    - Generate `BubbleData` dengan `radius` arbitrary dalam range `[30, 120]`
    - Assert: `radius >= 50` → Sparkline dirender; `radius < 50` → Sparkline tidak dirender
    - Minimum 100 iterasi

  - [x] 8.5 Tulis unit tests untuk BubbleTooltip
    - Test tooltip tidak dirender saat `bubble === null`
    - Test sparkline muncul saat `radius >= 50` dan tidak muncul saat `radius < 50`
    - Test graceful degradation saat `useHistorisKomoditas` error
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 9. Buat loading dan error states
  - [x] 9.1 Buat `apps/web/components/bubble-chart/bubble-chart-skeleton.tsx`
    - Render 21 lingkaran `<circle>` abu-abu dengan animasi `animate-pulse` (Tailwind)
    - Posisi lingkaran tersebar di canvas menggunakan posisi statis yang masuk akal (grid atau scatter)
    - Radius bervariasi antara 30–80px untuk tampilan natural
    - _Requirements: 8.1_

  - [x] 9.2 Buat `apps/web/components/bubble-chart/bubble-chart-error.tsx`
    - Tampilkan pesan error informatif (mis. "Gagal memuat data harga pangan")
    - Render tombol "Coba Lagi" menggunakan shadcn/ui `Button` yang memanggil prop `onRetry: () => void`
    - _Requirements: 8.3, 8.5_

  - [x] 9.3 Tulis unit tests untuk loading dan error states
    - Test `BubbleChartSkeleton` merender tepat 21 lingkaran
    - Test `BubbleChartError` memanggil `onRetry` saat tombol "Coba Lagi" diklik
    - _Requirements: 8.1, 8.3, 8.5_

- [x] 10. Buat DataFooter component
  - Buat `apps/web/components/data-footer.tsx`
  - Props: `{ latestDate?: string, earliestDate?: string }`
  - Tampilkan informasi tanggal data terbaru dan terlama — jika `latestDate` undefined (saat initial loading), tampilkan placeholder "Memuat data..."
  - Footer selalu dirender bahkan saat loading (tidak di-hide)
  - Gunakan shadcn/ui dan Tailwind untuk styling
  - _Requirements: 8.4_

- [x] 11. Checkpoint — Verifikasi infrastruktur dan komponen dasar
  - Pastikan semua tests pass: `bun run test --run` di `apps/web/`
  - Pastikan typecheck pass: `bun run typecheck`
  - Pastikan lint pass: `bun run lint`
  - Tanya user jika ada pertanyaan sebelum lanjut ke integrasi.

- [x] 12. Setup ResizeObserver dan BubbleChartContainer
  - Buat `apps/web/components/bubble-chart/bubble-chart-container.tsx`
  - Tambahkan `'use client'` directive
  - Gunakan `useRef` untuk container div dan `useState<{ width: number, height: number }>` untuk dimensi
  - Setup `ResizeObserver` di `useEffect` — restart simulation hanya jika perubahan > 50px (threshold dari requirements)
  - Render `BubbleChartSkeleton` saat `isLoading`
  - Render `BubbleChart` dengan `opacity-50` overlay saat `isRefetching && !isLoading`
  - Render `BubbleChartError` saat `isError` (menggantikan overlay)
  - Pass `onBubbleHover` ke `BubbleChart`, render `BubbleTooltip` di luar SVG
  - Container mengisi tinggi viewport tersisa via `flex-1` atau `calc(100vh - ...)`
  - _Requirements: 3.6, 8.1, 8.2, 8.3, 9.1, 9.4_

- [x] 13. Update `app/page.tsx` — wiring semua komponen
  - Tambahkan `'use client'` directive ke `app/page.tsx`
  - Definisikan state: `timeframe` (default `'1D'`), `provinsiId` (default `0`), `hoveredBubble`, `tooltipPos`
  - Panggil `useKomoditas(timeframe, provinsiId)` untuk mendapat `{ data, isLoading, isError, isRefetching, refetch }`
  - Render layout: Header (judul "Pantau Pangan"), `FilterControls` (TimeframeFilter + ProvinsiFilter), `BubbleChartContainer`, `DataFooter`
  - Pass `timeframe` dan `onChange` ke `TimeframeFilter` — perubahan timeframe tidak mengubah `provinsiId`
  - Pass `provinsiId` dan `onChange` ke `ProvinsiFilter` — perubahan provinsi tidak mengubah `timeframe`
  - Layout responsif: filter stack vertikal di mobile (`< 768px`), horizontal di desktop (`>= 768px`) via Tailwind `flex-col md:flex-row`
  - Gunakan Tailwind v4 utility classes untuk semua styling — inline styles hanya untuk nilai dinamis D3 (posisi x/y, radius, warna)
  - _Requirements: 6.1, 6.2, 6.4, 6.5, 7.1, 7.5, 7.6, 8.4, 9.1, 9.2, 9.3_

- [x] 14. Final checkpoint — Verifikasi end-to-end
  - Pastikan semua tests pass: `bun run test --run` di `apps/web/`
  - Pastikan typecheck pass: `bun run typecheck`
  - Pastikan lint pass: `bun run lint`
  - Pastikan build pass: `bun run build`
  - Tanya user jika ada pertanyaan sebelum selesai.

## Notes

- Tasks bertanda `*` bersifat opsional dan bisa di-skip untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk traceability
- Dependency install (Task 1) dan shadcn/ui setup (Task 2) harus selesai sebelum task lain
- `clampBubblePosition` (Task 7.1) dan `calculateTooltipPosition` (Task 8.1) adalah fungsi pure — buat sebelum property tests yang mengujinya
- D3 langsung mutate DOM untuk posisi bubble (bukan React state) — ini disengaja untuk performa animasi 60fps
- Tailwind v4 zero-config: jangan buat `tailwind.config.ts`, customize via `app/globals.css` `@theme` block
- ESLint single source di root: jika shadcn/ui init menghasilkan `eslint.config.js` di `apps/web/`, hapus

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2", "3.1"] },
    { "id": 2, "tasks": ["3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "5.1", "5.2", "5.3", "7.1"] },
    { "id": 4, "tasks": ["5.4", "5.5", "6.1", "6.2", "7.2", "7.3", "8.1"] },
    { "id": 5, "tasks": ["6.3", "6.4", "6.5", "7.4", "7.5", "8.2", "8.3", "9.1", "9.2"] },
    { "id": 6, "tasks": ["7.6", "7.7", "8.4", "8.5", "9.3", "10"] },
    { "id": 7, "tasks": ["12"] },
    { "id": 8, "tasks": ["13"] }
  ]
}
```
