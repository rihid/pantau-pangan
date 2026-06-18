# Implementation Plan: M5 Modal Detail Komoditas

## Overview

Membangun modal detail yang muncul saat user mengklik bubble di halaman utama. Modal terdiri dari tiga panel: Chart_Historis (D3.js line chart + HighLowMarker), Tabel_Geografis (collapsible tree table 4 level), dan Insight_Panel (LLM text, auto-fetch, cache-aware). Dibangun di atas fondasi M4 — tidak ada dependency baru.

Semua kode ditulis dalam TypeScript di `apps/web/`. Gunakan `bun add` untuk semua dependency — jangan edit `package.json` manual.

## Tasks

- [x] 1. Install shadcn/ui Dialog component
  - Jalankan: `bunx shadcn@latest add dialog` di `apps/web/`
  - Verifikasi `apps/web/components/ui/dialog.tsx` tersedia
  - Jika `shadcn` menghasilkan file config baru (`eslint.config.js`, `tailwind.config.ts`), hapus — andalkan root flat config dan Tailwind v4 zero-config
  - _Requirements: 1.7_

- [x] 2. Tambahkan fetch functions ke API client
  - Edit `apps/web/lib/api-client.ts`
  - Tambahkan `fetchHistorisModal(komoditasId: number, provinsiId: number): Promise<HargaHarian[]>`
    - Path: `/komoditas/${komoditasId}/historis?provinsiId=${provinsiId}`
  - Tambahkan `fetchDetailGeografis(komoditasId: number, provinsiId: number): Promise<{ data: BiDetailGridRow[] }>`
    - Path: `/komoditas/${komoditasId}/detail?provinsiId=${provinsiId}`
    - Import `BiDetailGridRow` dari `@pantau-pangan/shared`
  - Tambahkan `fetchInsight(komoditasId: number, provinsiId: number): Promise<InsightResponse>`
    - Path: `/komoditas/${komoditasId}/insight?provinsiId=${provinsiId}`
    - Import `InsightResponse` dari `@pantau-pangan/shared`
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 3. Buat pure utility functions di `modal-utils.ts`
  - [x] 3.1 Buat `apps/web/lib/modal-utils.ts`
    - Implementasikan `filterByTimeframe(data: HargaHarian[], timeframe: Timeframe): HargaHarian[]`
      - Filter berdasarkan `TIMEFRAME_DAYS[timeframe]` hari ke belakang dari tanggal terbaru
      - Jika data kurang dari durasi penuh, return semua data (graceful degradation)
      - Input kosong → return `[]`
    - Implementasikan `parseDateColumns(row: BiDetailGridRow): string[]`
      - Filter key dengan regex `/^\d{2}\/\d{2}\/\d{4}$/`
      - Return sorted ascending (tanggal terlama di awal) — parse DD/MM/YYYY untuk sorting
    - Implementasikan `formatHarga(value: number | null | undefined): string`
      - Null/0/undefined → return `"—"`
      - Nilai positif → integer dengan separator ribuan `id-ID`, tanpa prefix "Rp"
    - Implementasikan `formatHargaRp(value: number | null | undefined): string`
      - Null/0 → return `"Rp —"`
      - Nilai positif → `"Rp X.XXX/kg"` (tanpa desimal)
    - Implementasikan `formatPerubahan(perubahan: number, timeframe: Timeframe): { text: string; color: string; arrow: '↑' | '↓' | '' }`
      - Gunakan `VOLATILITY_THRESHOLDS[timeframe].stable` dan `significant` dari `@pantau-pangan/shared`
      - Warna: `#ef4444`/`#f97316` naik, `#22c55e`/`#84cc16` turun, `#6b7280` stabil
      - Stabil: `|perubahan| < stable` atau `perubahan === 0` → arrow `''`, color abu
    - Implementasikan `computeHighLow(data: HargaHarian[]): { max: HargaHarian; min: HargaHarian } | null`
      - Length ≤ 1 → return `null`
      - Return item dengan harga tertinggi (max) dan terendah (min)
    - Implementasikan `formatTanggal(tanggal: string): string`
      - Input `YYYY-MM-DD` → output `DD/MM/YYYY`
    - Implementasikan `sortByDateColumn(rows: BiDetailGridRow[], dateKey: string, direction: 'asc' | 'desc'): BiDetailGridRow[]`
      - Sort berdasarkan nilai numerik di kolom `dateKey`
      - Tidak mutate array asli — return copy
    - _Requirements: 2.2, 2.3, 3.1, 3.3, 4.2, 4.5, 4.6_

  - [x] 3.2 Tulis property tests untuk modal-utils (Property 1–5)
    - **Property 1: filterByTimeframe Correctness**
      - Generate `fc.array(fc.record({ tanggal: fc.date(), harga: fc.float({ min: 1000, max: 100000 }) }))` dan `fc.constantFrom('1D','1W','1M','3M','1Y')`
      - Assert: semua hasil `tanggal >= (tanggal_terbaru - TIMEFRAME_DAYS[tf])`, input kosong → output kosong
    - **Property 2: computeHighLow Invariant**
      - Generate `fc.array(fc.record({ harga: fc.float({ min: 100, max: 200000 }) }), { minLength: 0, maxLength: 50 })`
      - Assert: length ≤ 1 → `null`; length ≥ 2 → `max.harga >= min.harga`, max/min benar-benar max/min
    - **Property 3: formatHarga Formatting**
      - Generate `fc.oneof(fc.integer({ min: 1, max: 1_000_000 }), fc.constant(0), fc.constant(null))`
      - Assert: null/0 → `"—"`; positif → parseable integer, tidak mengandung "Rp"
    - **Property 4: parseDateColumns Returns Valid Dates**
      - Generate `BiDetailGridRow` dengan mix key tanggal valid dan key non-tanggal
      - Assert: semua key hasil cocok dengan `/^\d{2}\/\d{2}\/\d{4}$/`; key lain tidak muncul; sorted ascending
    - **Property 5: sortByDateColumn Stability**
      - Generate `fc.array(...)` dengan nilai harga acak dan `fc.constantFrom('asc','desc')`
      - Assert: ascending → `rows[i] <= rows[i+1]`; descending → `rows[i] >= rows[i+1]`; panjang tidak berubah
    - Minimum 100 iterasi per property
    - _Requirements: 3.1, 3.3, 4.2, 4.5, 4.6_

- [x] 4. Buat TanStack Query hooks
  - [x] 4.1 Buat `apps/web/lib/hooks/use-historis-modal.ts`
    - `queryKey: ['historis-modal', komoditasId, timeframe, provinsiId]`
    - `enabled: komoditasId !== null`
    - `staleTime: 60_000`
    - `retry`: max 2x, skip HTTP 4xx, exponential backoff (1s, 2s, cap 30s)
    - _Requirements: 6.1, 6.4, 6.7_

  - [x] 4.2 Buat `apps/web/lib/hooks/use-detail-geografis.ts`
    - `queryKey: ['detail-geografis', komoditasId, provinsiId]`
    - `enabled: komoditasId !== null`
    - `staleTime: 30_000`
    - `retry`: max 2x, skip HTTP 4xx, exponential backoff
    - _Requirements: 6.2, 6.5, 6.7_

  - [x] 4.3 Buat `apps/web/lib/hooks/use-insight.ts`
    - `queryKey: ['insight', komoditasId, provinsiId]`
    - `enabled: komoditasId !== null`
    - `staleTime: 5 * 60_000`
    - `retry`: max 2x, skip HTTP 4xx, exponential backoff
    - _Requirements: 6.3, 6.6, 6.7_

  - [x] 4.4 Tulis unit tests untuk hooks
    - Test setiap hook: tidak aktif saat `komoditasId === null` (verifikasi `enabled: false`)
    - Test `useHistorisModal`: query key berubah saat `timeframe` atau `provinsiId` berubah → memicu refetch
    - Test `useInsight`: query key TIDAK mengandung `timeframe` → tidak refetch saat timeframe berubah
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 5.7_

- [x] 5. Modifikasi `BubbleChart` — tambah `onBubbleClick`
  - Edit `apps/web/components/bubble-chart/bubble-chart.tsx`
  - Tambahkan prop opsional `onBubbleClick?: (bubble: BubbleData) => void` ke interface `BubbleChartProps`
  - Tambahkan `onClick={() => onBubbleClick?.(d)}` pada elemen `<circle>`
  - Gunakan `style={{ cursor: 'pointer' }}` sudah ada — tetap
  - Tidak mengubah perilaku `onBubbleHover` yang sudah ada
  - _Requirements: 1.1_

- [x] 6. Buat komponen skeleton dan error states
  - [x] 6.1 Buat `apps/web/components/modal/historis-chart-skeleton.tsx`
    - Render SVG placeholder: garis horizontal tipis (sumbu X simulasi) + blok abu vertikal (sumbu Y simulasi) dengan `animate-pulse`
    - Ukuran: gunakan 100% width container, tinggi 200px
    - _Requirements: 3.6_

  - [x] 6.2 Buat `apps/web/components/modal/geografis-table-skeleton.tsx`
    - Render 5 baris `<tr>` dengan 6 sel (`<td>`) abu per baris, `animate-pulse`
    - _Requirements: 4.7_

  - [x] 6.3 Buat `apps/web/components/modal/insight-panel-skeleton.tsx`
    - Render 4 blok teks abu-abu panjang berbeda dengan `animate-pulse` (simulasi 4 paragraf)
    - _Requirements: 5.2_

- [x] 7. Buat `HistorisChart` component
  - [x] 7.1 Buat `apps/web/components/modal/historis-chart.tsx`
    - Tambahkan `'use client'` directive
    - Props: `{ komoditasId: number; timeframe: Timeframe; provinsiId: number; namaKomoditas: string }`
    - Panggil `useHistorisModal(komoditasId, timeframe, provinsiId)` — data adalah `HargaHarian[]`
    - Filter data client-side via `filterByTimeframe(data, timeframe)` dari `modal-utils.ts`
    - Render state loading: `<HistorisChartSkeleton />`
    - Render state error: pesan + tombol "Coba lagi" yang memanggil `refetch()`
    - Render state empty (`filteredData.length === 0`): pesan "Data historis belum tersedia" (bukan error)
    - D3.js setup di `useEffect([filteredData, width, height])`:
      - `useRef<SVGSVGElement>` untuk SVG element
      - `useRef<number>` untuk dimensi menggunakan `ResizeObserver` pada container div
      - `d3.scaleTime()` untuk sumbu X (format `DD/MM` via `d3.timeFormat('%d/%m')`)
      - `d3.scaleLinear()` untuk sumbu Y (format integer dengan `d3.format(',')`)
      - `d3.line()` dengan `curveMonotoneX` untuk garis
      - `d3.transition().duration(300)` saat data/timeframe berubah
      - HighLowMarker: lingkaran `r=5` + label `Rp X.XXX` di samping — compute via `computeHighLow(filteredData)`
    - `aria-label` format: `"Line chart harga ${namaKomoditas} — ${filteredData.length} hari terakhir"`
    - `role="img"` pada SVG element
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 7.5_

  - [x] 7.2 Tulis property test untuk HighLowMarker rendering (Property 2 dari design)
    - Generate `HargaHarian[]` dengan length 0–50 dan harga acak
    - Render `HistorisChart` dengan data tersebut
    - Assert: length ≤ 1 → tidak ada elemen dengan class/attr `data-marker`; length ≥ 2 → tepat 2 marker
    - Minimum 100 iterasi
    - _Requirements: 3.3, 3.4_

  - [x] 7.3 Tulis unit tests untuk HistorisChart
    - Test loading state: `HistorisChartSkeleton` dirender saat `isLoading`
    - Test empty state: pesan "Data historis belum tersedia" muncul saat data kosong
    - Test error state: tombol "Coba lagi" memanggil `refetch`
    - Test `aria-label` memuat nama komoditas dan jumlah titik data
    - _Requirements: 3.6, 3.7, 3.8, 7.5_

- [x] 8. Buat `GeografisTable` component
  - [x] 8.1 Buat `apps/web/components/modal/geografis-table.tsx`
    - Tambahkan `'use client'` directive
    - Props: `{ komoditasId: number; provinsiId: number }`
    - Panggil `useDetailGeografis(komoditasId, provinsiId)`
    - Render state loading: `<GeografisTableSkeleton />`
    - Render state error: pesan + tombol "Coba lagi"
    - Parse kolom tanggal dari response via `parseDateColumns` — tampilkan tepat 5 kolom
    - State expand/collapse: `useState<Set<number>>` dengan Nasional (level 0) expanded by default
    - Fungsi `toggleNode(id: number)` untuk toggle Set
    - State sort: `useState<{ column: string | null; direction: 'asc' | 'desc' }>({ column: null, direction: 'desc' })`
    - Klik header kolom tanggal: klik pertama → desc; klik ulang kolom sama → toggle; klik kolom baru → reset ke desc
    - `getVisibleRows(allRows, expandedNodes)`: traverse tree, hanya render baris yang parentnya expanded
    - Render `<table>` semantik:
      - `<thead>` dengan `<th scope="col">` untuk tiap tanggal, `<th scope="row">` untuk nama wilayah
      - `<tbody>` dengan baris yang expand/collapse via toggle
      - Baris Nasional/Provinsi/Kota: tampilkan ikon `▶`/`▼` untuk state collapsed/expanded
      - Baris Pasar (level 3): tidak ada ikon, tidak bisa di-expand
      - Nilai harga diformat via `formatHarga(value)`; null/tidak ada → `"—"`
    - Container tabel: `overflow-x-auto` agar bisa scroll horizontal
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 7.6_

  - [x] 8.2 Tulis unit tests untuk GeografisTable
    - Test default state: baris Nasional expanded, Provinsi collapsed
    - Test toggle: klik baris Nasional → Provinsi muncul; klik lagi → hilang
    - Test baris Pasar (level 3) tidak bisa di-expand (tidak ada tombol toggle)
    - Test sort: klik header tanggal pertama kali → desc; klik lagi → asc
    - Test format: nilai null → `"—"`, nilai positif → tanpa prefix "Rp"
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

- [x] 9. Buat `InsightPanel` component
  - [x] 9.1 Buat `apps/web/components/modal/insight-panel.tsx`
    - Tambahkan `'use client'` directive
    - Props: `{ komoditasId: number; provinsiId: number }`
    - Panggil `useInsight(komoditasId, provinsiId)`
    - Timeout 35 detik: `useEffect` + `setTimeout(() => setTimedOut(true), 35_000)` saat `isLoading` — clear saat data tiba atau error
    - Render state loading: `<InsightPanelSkeleton />`
    - Render state timeout/error: pesan "Insight tidak tersedia saat ini" + tombol "Coba lagi" yang memanggil `refetch()` — tombol mereset state timeout
    - Render state success:
      - Split `insight` pada `\n\n` → array paragraf
      - Render setiap paragraf sebagai `<p className="mb-4 last:mb-0">`
      - Jika `cached: true`: tampilkan label kecil `"Dari cache · DD/MM/YYYY"` (format `generatedAt` via `formatTanggal`)
    - Tidak me-refetch saat timeframe berubah (queryKey tidak mengandung timeframe)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 9.2 Tulis unit tests untuk InsightPanel
    - Test auto-fetch saat mounted (tanpa interaksi user)
    - Test skeleton ditampilkan saat loading
    - Test label "Dari cache" muncul saat `cached: true`, tidak muncul saat `cached: false`
    - Test teks dibagi menjadi `<p>` berdasarkan `\n\n`
    - Test tombol "Coba lagi" memanggil `refetch` dan me-reset timeout state
    - Test timeout 35 detik: mock `setTimeout`, assert error state muncul
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 10. Buat `ModalHeader` component
  - Buat `apps/web/components/modal/modal-header.tsx`
  - Tambahkan `'use client'` directive
  - Props: `{ nama: string; harga: number; timeframe: Timeframe; onTimeframeChange: (tf: Timeframe) => void; perubahan?: Record<Timeframe, number> }`
  - Tampilkan `nama` sebagai `<h2>` atau `DialogTitle`
  - Tampilkan harga via `formatHargaRp(harga)`
  - Tampilkan % perubahan sesuai `timeframe` aktif via `formatPerubahan(perubahan[timeframe], timeframe)`
  - Render 5 tab `1D`/`1W`/`1M`/`3M`/`1Y` — tab aktif mendapat class highlight berbeda
  - `onTimeframeChange` tidak berinteraksi dengan state halaman utama
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 11. Buat `KomoditasModal` component (wrapper)
  - Buat `apps/web/components/modal/komoditas-modal.tsx`
  - Tambahkan `'use client'` directive
  - Props:
    ```typescript
    interface KomoditasModalProps {
      modalState: {
        komoditasId: number
        nama: string
        harga: number
        provinsiId: number
      } | null
      onClose: () => void
    }
    ```
  - State lokal: `timeframe: Timeframe` (default `'1D'`), di-reset ke `'1D'` saat `modalState` berubah ke komoditas baru
  - Gunakan shadcn/ui `Dialog` dengan `open={modalState !== null}` dan `onOpenChange={(open) => { if (!open) onClose() }}`
  - Layout responsif via Tailwind:
    - `max-w-5xl`, `max-h-[90vh]`, `overflow-y-auto`
    - Mobile: flex-col (Chart → Tabel → Insight)
    - Desktop (md:): Chart full-width di atas; Tabel (60%) + Insight (40%) berdampingan di bawah
  - Render `<ModalHeader>`, `<HistorisChart>`, `<GeografisTable>`, `<InsightPanel>` dengan props dari `modalState` dan `timeframe`
  - Inline style hanya untuk nilai D3 — semua layout via Tailwind v4 utility classes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 12. Integrasi ke `page.tsx`
  - Edit `apps/web/app/page.tsx`
  - Tambahkan `useState` untuk `modalState`
  - Tambahkan handler `handleBubbleClick(bubble: BubbleData)` yang set `modalState`
  - Pass `onBubbleClick={handleBubbleClick}` ke `BubbleChartContainer` → teruskan ke `BubbleChart`
  - Render `<KomoditasModal modalState={modalState} onClose={() => setModalState(null)} />` di dalam `<main>`
  - Verifikasi bahwa perubahan state modal tidak mengubah `timeframe` dan `provinsiId` halaman utama
  - _Requirements: 1.1, 1.2, 1.5, 1.6_

- [x] 13. Checkpoint — Verifikasi komponen dan tests
  - Pastikan semua tests pass: `bun run test --run` di `apps/web/`
  - Pastikan typecheck pass: `bun run typecheck`
  - Pastikan lint pass: `bun run lint`

- [x] 14. Tulis property test untuk Modal State Isolation (Property 6)
  - **Property 6: Modal State Isolation**
  - **Validates: Requirements 1.6, 5.7**
  - Generate urutan operasi acak: mix antara `setTimeframeModal` dan set `timeframe`/`provinsiId` halaman utama
  - Assert:
    - Perubahan `Timeframe_Modal` tidak mengubah `timeframe` di halaman utama
    - Menutup modal me-reset `modalState` ke `null` tanpa mengubah `timeframe` dan `provinsiId` halaman utama
  - Minimum 100 iterasi
  - _Requirements: 1.6, 5.7_

- [x] 15. Final checkpoint — Verifikasi end-to-end
  - Pastikan semua tests pass: `bun run test --run` di `apps/web/`
  - Pastikan typecheck pass: `bun run typecheck`
  - Pastikan lint pass: `bun run lint`
  - Pastikan build pass: `bun run build`

## Notes

- Tidak ada dependency baru — D3.js, shadcn/ui, TanStack Query, fast-check, vitest sudah ada dari M4
- `onBubbleClick` prop baru di `BubbleChart` adalah opsional (`?`) agar tidak breaking change
- `filterByTimeframe` dilakukan client-side pada response `/historis` — endpoint tidak perlu menerima parameter `timeframe`
- Timeout 35 detik di `InsightPanel` menggunakan `useEffect` + `setTimeout`, bukan opsi TanStack Query — ini agar bisa di-clear saat data tiba sebelum timeout
- Kolom tanggal di `GeografisTable` di-parse dari key dinamis response BI — selalu gunakan regex `/^\d{2}\/\d{2}\/\d{4}$/`, jangan hardcode
- D3.js di `HistorisChart` mutate DOM langsung (sama dengan `BubbleChart` di M4) — bukan React state
- shadcn/ui `Dialog` sudah handle focus trap, Escape, aria-modal secara otomatis
- Tailwind v4 zero-config: jangan buat `tailwind.config.ts`; semua customization via `app/globals.css` `@theme` block

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1", "4.1", "4.2", "4.3", "5"] },
    { "id": 2, "tasks": ["3.2", "4.4", "6.1", "6.2", "6.3"] },
    { "id": 3, "tasks": ["7.1", "8.1", "9.1", "10"] },
    { "id": 4, "tasks": ["7.2", "7.3", "8.2", "9.2"] },
    { "id": 5, "tasks": ["11"] },
    { "id": 6, "tasks": ["12"] },
    { "id": 7, "tasks": ["13"] },
    { "id": 8, "tasks": ["14"] },
    { "id": 9, "tasks": ["15"] }
  ]
}
```
