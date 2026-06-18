# Design Document: M5 Modal Detail Komoditas

## Overview

M5 menambahkan modal detail yang muncul saat user mengklik bubble di halaman utama. Modal terdiri dari tiga panel: Chart_Historis (D3.js line chart), Tabel_Geografis (collapsible tree table), dan Insight_Panel (LLM text). Semua data fetching menggunakan TanStack Query. Tidak ada dependency baru — memanfaatkan D3.js, shadcn/ui, dan TanStack Query yang sudah tersedia dari M4.

---

## Architecture

### Component Tree

```
page.tsx  (existing, 'use client')
  ├── [existing bubble chart components]
  └── KomoditasModal  (new, 'use client')
        ├── Dialog (shadcn/ui)
        │     ├── DialogHeader
        │     │     ├── ModalHeader          (nama, harga, % perubahan, tab timeframe)
        │     │     └── [DialogClose button]
        │     └── DialogContent (scrollable body)
        │           ├── HistorisChart        (D3.js line chart + HighLowMarker)
        │           │     ├── [skeleton state]
        │           │     ├── [error state]
        │           │     └── [empty state]
        │           ├── GeografisTable       (collapsible tree table)
        │           │     ├── [skeleton state]
        │           │     └── [error state]
        │           └── InsightPanel         (LLM text)
        │                 ├── [skeleton state]
        │                 └── [error state]
```

### State Management

`Modal_State` dikelola di `page.tsx` menggunakan `useState`. Bubble chart memanggil callback `onBubbleClick` yang baru (selain `onBubbleHover` yang sudah ada).

```typescript
// Tambahan di page.tsx
const [modalState, setModalState] = useState<{
  komoditasId: number
  nama: string
  harga: number
  provinsiId: number
} | null>(null)

const handleBubbleClick = (bubble: BubbleData) => {
  setModalState({
    komoditasId: bubble.komoditasId,
    nama: bubble.nama,
    harga: bubble.harga,
    provinsiId, // dari filter provinsi halaman utama
  })
}
```

`Timeframe_Modal` adalah state lokal di dalam `KomoditasModal` — tidak diangkat ke `page.tsx`. Ini memastikan state halaman utama tidak terpengaruh.

### Data Flow

```
page.tsx
  ├── onBubbleClick → setModalState({ komoditasId, nama, harga, provinsiId })
  └── <KomoditasModal modalState={modalState} onClose={() => setModalState(null)} />
        │
        ├── useHistorisModal(komoditasId, timeframe, provinsiId)
        │     └── GET /komoditas/:id/historis?provinsiId=:provinsiId
        │           → HargaHarian[] (full history, difilter client-side per timeframe)
        │
        ├── useDetailGeografis(komoditasId, provinsiId)
        │     └── GET /komoditas/:id/detail?provinsiId=:provinsiId
        │           → BiDetailGridRow[] (selalu 5 hari dari BI, live)
        │
        └── useInsight(komoditasId, provinsiId)
              └── GET /komoditas/:id/insight?provinsiId=:provinsiId
                    → InsightResponse { insight, cached, generatedAt }
```

### File Structure

```
apps/web/
├── app/
│   └── page.tsx                          ← tambah modalState + handleBubbleClick
├── components/
│   ├── bubble-chart/
│   │   └── bubble-chart.tsx              ← tambah prop onBubbleClick
│   └── modal/                            ← folder baru
│       ├── komoditas-modal.tsx           ← Dialog wrapper + Timeframe_Modal state
│       ├── modal-header.tsx              ← nama, harga, %, tab timeframe
│       ├── historis-chart.tsx            ← D3.js line chart
│       ├── historis-chart-skeleton.tsx   ← skeleton
│       ├── geografis-table.tsx           ← collapsible tree table
│       ├── geografis-table-skeleton.tsx  ← skeleton
│       ├── insight-panel.tsx             ← LLM text renderer
│       └── insight-panel-skeleton.tsx    ← skeleton
└── lib/
    ├── hooks/
    │   ├── use-historis-modal.ts          ← TanStack Query hook
    │   ├── use-detail-geografis.ts        ← TanStack Query hook
    │   └── use-insight.ts                 ← TanStack Query hook
    ├── api-client.ts                      ← tambah 3 fetch functions baru
    └── modal-utils.ts                     ← pure functions: filterByTimeframe, parseDetailRows, formatHarga
```

### Responsive Layout

**Desktop (≥ 768px)**

```
┌─────────────────────────────────────────┐  max-w-5xl (64rem)
│ Header: nama · Rp XX.XXX/kg · ↑X.X%    │
│ Tabs: [1D] [1W] [1M] [3M] [1Y]         │
├─────────────────────────────────────────┤
│                                         │
│         HistorisChart (full width)      │
│                                         │
├──────────────────────┬──────────────────┤
│                      │                  │
│  GeografisTable 60%  │ InsightPanel 40% │
│  (overflow-x auto)   │                  │
│                      │                  │
└──────────────────────┴──────────────────┘
```

**Mobile (< 768px)**

```
┌────────────────────┐  max-h-[90vh], overflow-y-auto
│ Header             │
│ Tabs               │
├────────────────────┤
│  HistorisChart     │
├────────────────────┤
│  GeografisTable    │
│  (overflow-x auto) │
├────────────────────┤
│  InsightPanel      │
└────────────────────┘
```

---

## Components and Interfaces

### `KomoditasModal`

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

State lokal: `timeframe: Timeframe` (default `'1D'`), di-reset ke `'1D'` saat `komoditasId` berubah.

### `ModalHeader`

```typescript
interface ModalHeaderProps {
  nama: string
  harga: number
  timeframe: Timeframe
  onTimeframeChange: (tf: Timeframe) => void
  perubahan?: Record<Timeframe, number>
}
```

Render nama komoditas, harga via `formatHargaRp`, % perubahan via `formatPerubahan`, dan 5 tab timeframe.

### `HistorisChart`

```typescript
interface HistorisChartProps {
  komoditasId: number
  timeframe: Timeframe
  provinsiId: number
  namaKomoditas: string
}
```

D3.js setup di `useEffect([filteredData, width, height])`:

- `d3.scaleTime()` untuk X (format `DD/MM`)
- `d3.scaleLinear()` untuk Y (format integer ribuan)
- `d3.line()` dengan `curveMonotoneX`
- `d3.transition().duration(300)` saat data berubah
- HighLowMarker: lingkaran `r=5` + label `Rp X.XXX`

### `GeografisTable`

```typescript
interface GeografisTableProps {
  komoditasId: number
  provinsiId: number
}
```

Internal state:

- `expandedNodes: Set<number>` — Nasional (level 0) expanded by default
- `sortState: { column: string | null; direction: 'asc' | 'desc' }`

### `InsightPanel`

```typescript
interface InsightPanelProps {
  komoditasId: number
  provinsiId: number
}
```

Internal state: `timedOut: boolean` — di-set `true` via `setTimeout(35_000)` saat loading.

### TanStack Query Hooks

```typescript
function useHistorisModal(
  komoditasId: number | null,
  timeframe: Timeframe,
  provinsiId: number,
): UseQueryResult<HargaHarian[]>

function useDetailGeografis(
  komoditasId: number | null,
  provinsiId: number,
): UseQueryResult<{ data: BiDetailGridRow[] }>

function useInsight(komoditasId: number | null, provinsiId: number): UseQueryResult<InsightResponse>
```

Semua hook: `enabled: komoditasId !== null`, retry max 2x skip HTTP 4xx, exponential backoff 1s→2s cap 30s.

### `BubbleChart` — Modifikasi

Tambah prop opsional `onBubbleClick?: (bubble: BubbleData) => void` ke interface yang sudah ada. Tambah `onClick={() => onBubbleClick?.(d)}` pada `<circle>`.

---

## Data Models

### `ModalState`

```typescript
type ModalState = {
  komoditasId: number
  nama: string
  harga: number
  provinsiId: number
} | null
```

### Pure Utility Functions (`modal-utils.ts`)

```typescript
// Filter HargaHarian[] berdasarkan TIMEFRAME_DAYS[timeframe] hari terakhir
function filterByTimeframe(data: HargaHarian[], timeframe: Timeframe): HargaHarian[]

// Parse date keys dari BiDetailGridRow, return sorted ascending
// Key format: regex /^\d{2}\/\d{2}\/\d{4}$/
function parseDateColumns(row: BiDetailGridRow): string[]

// Format harga sebagai integer ribuan tanpa "Rp" — "—" jika null/0
function formatHarga(value: number | null | undefined): string

// Format harga dengan "Rp X.XXX/kg" — "Rp —" jika null/0
function formatHargaRp(value: number | null | undefined): string

// Format % perubahan dengan arrow + warna berdasarkan VOLATILITY_THRESHOLDS
function formatPerubahan(
  perubahan: number,
  timeframe: Timeframe,
): { text: string; color: string; arrow: '↑' | '↓' | '' }

// Compute titik max/min dari HargaHarian[] — null jika length <= 1
function computeHighLow(data: HargaHarian[]): { max: HargaHarian; min: HargaHarian } | null

// Format 'YYYY-MM-DD' ke 'DD/MM/YYYY'
function formatTanggal(tanggal: string): string

// Sort BiDetailGridRow[] berdasarkan nilai kolom tanggal
function sortByDateColumn(
  rows: BiDetailGridRow[],
  dateKey: string,
  direction: 'asc' | 'desc',
): BiDetailGridRow[]
```

### Tree Traversal untuk Visible Rows

```typescript
// Traverse tree, hanya return baris yang parentnya ada di expandedNodes
function getVisibleRows(
  allRows: BiDetailGridRow[],
  expandedNodes: Set<number>,
  sortState: { column: string | null; direction: 'asc' | 'desc' },
): BiDetailGridRow[]
```

Level parent-child relationship berdasarkan field `level` di `BiDetailGridRow` (0=Nasional, 1=Provinsi, 2=Kota, 3=Pasar).

---

## Correctness Properties

### Property 1: `filterByTimeframe` Correctness

**Validates: Requirements 3.1, 3.9**

Generate `HargaHarian[]` dengan tanggal acak dan timeframe acak. Assert:

- Semua item dalam hasil punya `tanggal >= (tanggal_terbaru - TIMEFRAME_DAYS[tf] hari)`
- Jika data kurang dari durasi penuh, return semua data (graceful degradation)
- Input kosong → output kosong

### Property 2: `computeHighLow` Invariant

**Validates: Requirements 3.3, 3.4**

Generate `HargaHarian[]` dengan harga acak. Assert:

- Array kosong atau 1 elemen → return `null`
- Array ≥ 2 elemen → `result.max.harga >= semua harga`, `result.min.harga <= semua harga`
- `result.max.harga >= result.min.harga`

### Property 3: `formatHarga` Formatting

**Validates: Requirements 4.6**

Generate `fc.integer({ min: 0, max: 1_000_000 })` termasuk edge case 0 dan null. Assert:

- Null/0 → return `"—"`
- Nilai positif → tidak mengandung "Rp", parseable integer, menggunakan separator ribuan

### Property 4: `parseDateColumns` Returns Valid Dates

**Validates: Requirements 4.2**

Generate `BiDetailGridRow` dengan berbagai kombinasi key. Assert:

- Semua key yang dikembalikan cocok dengan `/^\d{2}\/\d{2}\/\d{4}$/`
- Key non-tanggal (id, name, category, level) tidak muncul di hasil
- Hasil diurutkan ascending

### Property 5: `sortByDateColumn` Stability

**Validates: Requirements 4.5**

Generate `BiDetailGridRow[]` dengan nilai harga acak. Assert:

- Descending: setiap pasang adjacent `rows[i].harga >= rows[i+1].harga`
- Ascending: setiap pasang adjacent `rows[i].harga <= rows[i+1].harga`
- Panjang array tidak berubah

### Property 6: Modal State Isolation

**Validates: Requirements 1.6, 5.7**

Generate urutan operasi acak yang mencampur perubahan `Timeframe_Modal` dan state halaman utama. Assert:

- Perubahan `Timeframe_Modal` tidak mengubah `timeframe` dan `provinsiId` di halaman utama
- Menutup modal me-reset `modalState` ke `null` tanpa mengubah state halaman utama

---

## Error Handling

### Network/Server Errors (5xx)

TanStack Query retry max 2x dengan exponential backoff (1s, 2s, cap 30s). Setelah retry habis, komponen menampilkan error state dengan tombol "Coba lagi" yang memanggil `refetch()`.

### Client Errors (4xx)

Tidak di-retry — langsung ke error state. Ini menghindari retry berulang untuk request yang memang salah (mis. komoditasId tidak valid).

### Empty State vs Error State

- `/historis` return array kosong → `HistorisChart` menampilkan "Data historis belum tersedia" (bukan error, tidak ada tombol retry)
- `/historis` gagal → error state dengan tombol retry
- Insight timeout (>35 detik) → error state dengan pesan timeout + tombol retry

### Modal Tidak Tutup Saat Error

Error state di `HistorisChart`, `GeografisTable`, atau `InsightPanel` tidak menutup modal — setiap panel independent. User bisa retry panel yang error tanpa kehilangan data panel lain.

---

## Testing Strategy

### Unit Tests

Setiap komponen diuji dengan `@testing-library/react`:

- Loading/skeleton state
- Error state + tombol retry memanggil `refetch`
- Empty state (khusus `HistorisChart`)
- Success state dengan data mock
- Aksesibilitas: `aria-label`, `role`, semantic HTML

### Property-Based Tests (`fast-check`)

6 properties yang menguji fungsi pure di `modal-utils.ts` dan isolasi state modal. Minimum 100 iterasi per property.

### Integration

Verifikasi bahwa `onBubbleClick` di `BubbleChart` → `modalState` di `page.tsx` → `KomoditasModal` terbuka dengan data yang benar.

### Aksesibilitas

- `shadcn/ui Dialog` sudah menyediakan `role="dialog"`, `aria-modal="true"`, focus trap, Escape handler secara otomatis
- `HistorisChart` menggunakan `<svg role="img" aria-label="...">`
- `GeografisTable` menggunakan `<table>` semantik dengan `<th scope="col">` dan `<th scope="row">`
- Tombol expand/collapse di tabel memiliki `aria-expanded`
