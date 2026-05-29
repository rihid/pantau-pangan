# Design Document — M4 Bubble Chart Frontend

## Overview

M4 membangun halaman utama Pantau Pangan: bubble chart interaktif yang memvisualisasikan pergerakan harga 21 komoditas pangan strategis nasional. Milestone ini mencakup:

1. **Setup infrastruktur frontend** — TanStack Query provider, shadcn/ui, API client
2. **Data fetching layer** — custom hooks berbasis TanStack Query
3. **Bubble chart** — D3.js force simulation dengan label, warna, dan animasi
4. **Filter controls** — timeframe (1D/1W/1M/3M/1Y) dan provinsi
5. **Tooltip** — hover detail dengan sparkline kondisional
6. **Loading & error states** — skeleton, refetching overlay, error UI

M4 adalah fondasi visual untuk M5 (modal detail) dan M6 (polish). Semua komponen dibangun di `apps/web/` menggunakan Next.js App Router, Tailwind v4 zero-config, dan shadcn/ui.

### Keputusan Desain Utama

- **D3.js hanya untuk bubble chart** — semua komponen UI lain (filter, tooltip, skeleton) menggunakan shadcn/ui + Tailwind
- **`'use client'` minimal** — hanya komponen yang butuh browser API atau interaktivitas yang mendapat directive ini; layout dan page tetap server component
- **Radius dan warna dari API** — backend sudah menghitung `radius` dan `color` via `getBubbleRadius`/`getBubbleColor` dari `packages/shared`; frontend hanya render
- **State di page level** — `timeframe` dan `provinsiId` di-manage di `app/page.tsx` sebagai client component, di-pass ke bawah sebagai props

---

## Architecture

### Component Tree

```
app/page.tsx ('use client')
├── Header (server-renderable, shadcn/ui)
├── FilterControls ('use client')
│   ├── TimeframeFilter (shadcn/ui Button group)
│   └── ProvinsiFilter (shadcn/ui Select)
├── BubbleChartContainer ('use client')
│   ├── BubbleChart (D3.js SVG, 'use client')
│   │   ├── <svg> (role="img", aria-label)
│   │   │   ├── <circle> × 21 (per komoditas)
│   │   │   └── <text> × N (label, conditional radius >= 40)
│   │   └── BubbleTooltip (React portal, di luar SVG)
│   ├── BubbleChartSkeleton (loading state, 21 pulse circles)
│   └── BubbleChartError (error state, tombol retry)
└── DataFooter (server-renderable)
```

### Data Flow

```
API Backend (port 3001)
    │
    ▼
lib/api-client.ts          ← fungsi fetch ke NEXT_PUBLIC_API_URL
    │
    ▼
lib/hooks/
  useKomoditas(tf, provId)  ← TanStack Query, staleTime 30s
  useProvinsi()             ← TanStack Query, staleTime 5m
  useHistorisKomoditas(id)  ← TanStack Query, enabled when id != null
    │
    ▼
app/page.tsx               ← state: timeframe, provinsiId
    │
    ├── FilterControls     ← reads/writes timeframe + provinsiId
    └── BubbleChartContainer
            │
            ├── BubbleChart ← reads BubbleData[], renders D3 SVG
            └── BubbleTooltip ← reads hoveredBubble, calls useHistorisKomoditas
```

### Dependency yang Perlu Di-install

```bash
# Runtime dependencies untuk apps/web
bun add d3 @tanstack/react-query --filter=@pantau-pangan/web

# Type definitions
bun add -d @types/d3 --filter=@pantau-pangan/web

# shadcn/ui diinisialisasi via:
# bunx shadcn@latest init
# Kemudian tambah komponen yang dibutuhkan:
# bunx shadcn@latest add button select badge
```

---

## Components and Interfaces

### File/Folder Structure

```
apps/web/
├── app/
│   ├── layout.tsx              # DIMODIFIKASI: tambah QueryClientProvider wrapper
│   ├── page.tsx                # DIMODIFIKASI: 'use client', state timeframe + provinsiId
│   └── globals.css             # DIMODIFIKASI: tambah bubble color CSS vars di @theme
├── components/
│   ├── providers/
│   │   └── query-provider.tsx  # 'use client' wrapper untuk QueryClientProvider
│   ├── bubble-chart/
│   │   ├── bubble-chart.tsx    # Komponen utama D3 SVG ('use client')
│   │   ├── bubble-tooltip.tsx  # Tooltip React portal ('use client')
│   │   ├── bubble-chart-skeleton.tsx  # 21 pulse circles
│   │   └── bubble-chart-error.tsx     # Error state + retry button
│   ├── filters/
│   │   ├── timeframe-filter.tsx  # 5 tombol timeframe + data badge
│   │   └── provinsi-filter.tsx   # shadcn/ui Select dropdown
│   └── data-footer.tsx           # Footer informasi data
└── lib/
    ├── api-client.ts             # Fungsi fetch ke API backend
    └── hooks/
        ├── use-komoditas.ts      # useKomoditas(timeframe, provinsiId)
        ├── use-provinsi.ts       # useProvinsi()
        └── use-historis-komoditas.ts  # useHistorisKomoditas(id, provinsiId)
```

### Interface Komponen Utama

```typescript
// components/bubble-chart/bubble-chart.tsx
interface BubbleChartProps {
  data: BubbleData[]
  isRefetching?: boolean
  width: number
  height: number
  onBubbleHover: (bubble: BubbleData | null, x: number, y: number) => void
}

// components/bubble-chart/bubble-tooltip.tsx
interface BubbleTooltipProps {
  bubble: BubbleData | null
  x: number
  y: number
  provinsiId: number
}

// components/filters/timeframe-filter.tsx
interface TimeframeFilterProps {
  value: Timeframe
  onChange: (tf: Timeframe) => void
  dataBadge?: Record<Timeframe, number | null> // actual data points per timeframe
}

// components/filters/provinsi-filter.tsx
interface ProvinsiFilterProps {
  value: number
  onChange: (provinsiId: number) => void
}

// components/data-footer.tsx
interface DataFooterProps {
  latestDate?: string // tanggal data terbaru
  earliestDate?: string // tanggal data pertama
}
```

### API Client

```typescript
// lib/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function fetchKomoditas(
  timeframe: Timeframe,
  provinsiId: number,
): Promise<BubbleData[]>

export async function fetchProvinsi(): Promise<Provinsi[]>

export async function fetchHistorisKomoditas(
  komoditasId: number,
  provinsiId: number,
): Promise<HargaHarian[]>
```

### TanStack Query Hooks

```typescript
// lib/hooks/use-komoditas.ts
export function useKomoditas(timeframe: Timeframe, provinsiId: number) {
  return useQuery({
    queryKey: ['komoditas', timeframe, provinsiId],
    queryFn: () => fetchKomoditas(timeframe, provinsiId),
    staleTime: 30_000,
    retry: 2,
  })
}

// lib/hooks/use-provinsi.ts
export function useProvinsi() {
  return useQuery({
    queryKey: ['provinsi'],
    queryFn: fetchProvinsi,
    staleTime: 5 * 60_000,
    retry: 2,
  })
}

// lib/hooks/use-historis-komoditas.ts
export function useHistorisKomoditas(komoditasId: number | null, provinsiId: number) {
  return useQuery({
    queryKey: ['historis', komoditasId, provinsiId],
    queryFn: () => fetchHistorisKomoditas(komoditasId!, provinsiId),
    enabled: komoditasId !== null,
    staleTime: 60_000,
    retry: 2,
  })
}
```

---

## Data Models

### State di `app/page.tsx`

```typescript
// State yang di-manage di page level
const [timeframe, setTimeframe] = useState<Timeframe>('1D')
const [provinsiId, setProvinsiId] = useState<number>(0)
const [hoveredBubble, setHoveredBubble] = useState<BubbleData | null>(null)
const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
```

### D3 Simulation Node

```typescript
// Internal type untuk D3 force simulation
interface SimulationNode extends BubbleData {
  x: number
  y: number
  vx: number
  vy: number
  fx: number | null
  fy: number | null
}
```

### Data Badge Calculation

```typescript
// Kalkulasi data badge dari response API
// API mengembalikan BubbleData[] — jumlah data points bisa diinfer dari
// field tambahan atau dari endpoint terpisah
// Untuk M4: badge dihitung dari metadata response atau field `dataDays` di BubbleData

// TIMEFRAME_DAYS dari packages/shared
// badge ditampilkan jika actualDays < TIMEFRAME_DAYS[timeframe]
```

---

## D3.js Force Simulation Architecture

### Lifecycle

```
useEffect([data, width, height])
    │
    ├── 1. Buat/update SimulationNode[] dari BubbleData[]
    │      (preserve x/y dari node sebelumnya jika komoditasId sama)
    │
    ├── 2. Setup D3 simulation:
    │      simulation
    │        .force('center', forceCenter(width/2, height/2))
    │        .force('collide', forceCollide(d => d.radius + 2))
    │        .force('charge', forceManyBody().strength(-30))
    │
    ├── 3. Pada setiap tick:
    │      - Clamp posisi: x = clamp(d.x, d.radius, width - d.radius)
    │      - Clamp posisi: y = clamp(d.y, d.radius, height - d.radius)
    │      - Update React state (atau langsung mutate DOM via D3 select)
    │
    ├── 4. Transisi animasi 400ms via D3 transition:
    │      d3.select(svgRef.current)
    │        .selectAll('circle')
    │        .transition().duration(400)
    │        .attr('cx', d => d.x)
    │        .attr('cy', d => d.y)
    │        .attr('r', d => d.radius)
    │
    └── 5. Cleanup: simulation.stop() di return function
```

### Strategi Render: D3 + React Hybrid

Bubble chart menggunakan **hybrid approach**:

- React merender struktur SVG awal (circle, text elements)
- D3 simulation mengupdate posisi via direct DOM mutation (lebih performa untuk animasi fisika)
- Tooltip dan overlay tetap React state

```typescript
// Di dalam BubbleChart component:
const svgRef = useRef<SVGSVGElement>(null)
const simulationRef = useRef<d3.Simulation<SimulationNode, undefined> | null>(null)

// D3 langsung mutate DOM untuk posisi — tidak lewat React state
// untuk menghindari re-render 60fps yang mahal
```

### ResizeObserver

```typescript
useEffect(() => {
  const container = containerRef.current
  if (!container) return

  const observer = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return
    const { width, height } = entry.contentRect
    // Restart simulation hanya jika perubahan > 50px
    if (Math.abs(width - prevWidth) > 50 || Math.abs(height - prevHeight) > 50) {
      setDimensions({ width, height })
    }
  })

  observer.observe(container)
  return () => observer.disconnect()
}, [])
```

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

PBT applicable untuk M4 karena ada beberapa fungsi pure dan rendering logic yang behavior-nya bervariasi secara bermakna dengan input: rendering bubble dari array data, label generation, tooltip positioning, dan query key construction. Library yang digunakan: **fast-check** (TypeScript-native, cocok untuk Next.js/React ecosystem).

```bash
bun add -d fast-check --filter=@pantau-pangan/web
```

#### Refleksi Redundansi

Sebelum menulis properties final, berikut analisis redundansi:

- **3.1 (circle count/radius) dan 3.2 (circle color)** — keduanya tentang rendering BubbleData ke circle. Bisa digabung menjadi satu property "rendering fidelity" yang memverifikasi radius DAN color sekaligus.
- **4.1 (label content) dan 4.2 (arrow indicator)** — 4.2 adalah subset dari 4.1. Digabung menjadi satu property tentang label correctness.
- **4.3 (label hidden < 40px) dan 4.6 (no arrow when stable)** — keduanya tentang label visibility/content berdasarkan kondisi. Bisa digabung menjadi satu property "label conditional rendering".
- **6.4 (timeframe preserved on provinsi change) dan 7.6 (provinsi preserved on timeframe change)** — keduanya tentang filter independence. Digabung menjadi satu property "filter state independence".
- **2.3 (refetch on param change) dan 2.4 (enabled condition)** — keduanya tentang query configuration. Tetap terpisah karena menguji aspek berbeda.

### Property 1: Bubble Rendering Fidelity

_For any_ array `BubbleData[]` yang valid (panjang 1–21), setiap elemen harus dirender sebagai elemen `<circle>` SVG dengan atribut `r` yang sama dengan field `radius` dan atribut `fill` yang sama dengan field `color` dari data yang sesuai.

**Validates: Requirements 3.1, 3.2**

### Property 2: Label Conditional Rendering

_For any_ `BubbleData` dengan `radius >= 40` dan `perubahan > 0`, label yang dirender harus mengandung karakter `↑` dan format persentase dengan 1 desimal. _For any_ `BubbleData` dengan `radius >= 40` dan `perubahan < 0`, label harus mengandung `↓`. _For any_ `BubbleData` dengan `color === '#6b7280'` (stabil), label tidak boleh mengandung `↑` atau `↓`. _For any_ `BubbleData` dengan `radius < 40`, tidak ada elemen `<text>` yang dirender untuk bubble tersebut.

**Validates: Requirements 4.1, 4.2, 4.3, 4.6**

### Property 3: Bubble Position Clamping Invariant

_For any_ kombinasi `(width, height, radius)` di mana `width > 0`, `height > 0`, dan `radius` dalam range `[30, 120]`, fungsi clamp posisi bubble harus menghasilkan `x` dalam `[radius, width - radius]` dan `y` dalam `[radius, height - radius]`.

**Validates: Requirements 3.7**

### Property 4: Tooltip Sparkline Threshold

_For any_ `BubbleData` dengan `radius >= 50`, komponen `BubbleTooltip` harus merender komponen Sparkline. _For any_ `BubbleData` dengan `radius < 50`, komponen `BubbleTooltip` tidak boleh merender Sparkline.

**Validates: Requirements 5.2, 5.3**

### Property 5: Tooltip Viewport Containment

_For any_ kombinasi `(bubbleX, bubbleY, viewportWidth, viewportHeight)` yang valid, fungsi `calculateTooltipPosition` harus menghasilkan posisi `(tooltipX, tooltipY)` di mana `tooltipX >= 0`, `tooltipX + TOOLTIP_WIDTH <= viewportWidth`, `tooltipY >= 0`, dan `tooltipY + TOOLTIP_HEIGHT <= viewportHeight`.

**Validates: Requirements 5.5**

### Property 6: Data Badge Display Logic

_For any_ kombinasi `(timeframe, actualDays)` di mana `actualDays < TIMEFRAME_DAYS[timeframe]`, fungsi `formatDataBadge` harus mengembalikan string yang mengandung timeframe dan jumlah hari aktual (mis. `"1W · 5d"`). _For any_ kombinasi di mana `actualDays >= TIMEFRAME_DAYS[timeframe]`, fungsi harus mengembalikan `null` (badge tidak ditampilkan).

**Validates: Requirements 6.3**

### Property 7: Filter State Independence

_For any_ urutan operasi yang mencampur perubahan `timeframe` dan `provinsiId`, nilai `timeframe` tidak boleh berubah akibat perubahan `provinsiId`, dan nilai `provinsiId` tidak boleh berubah akibat perubahan `timeframe`.

**Validates: Requirements 6.4, 7.6**

### Property 8: Query Key Uniqueness

_For any_ dua pasang parameter `(timeframe1, provinsiId1)` dan `(timeframe2, provinsiId2)` yang berbeda (setidaknya satu parameter berbeda), query key yang dihasilkan oleh `useKomoditas` harus berbeda — sehingga TanStack Query memperlakukan keduanya sebagai query yang berbeda dan melakukan refetch.

**Validates: Requirements 2.3**

### Property 9: Aria Label Completeness

_For any_ `BubbleData`, atribut `aria-label` pada elemen `<circle>` yang dirender harus mengandung nama komoditas, nilai harga yang diformat sebagai Rupiah, dan persentase perubahan.

**Validates: Requirements 4.5**

---

## Error Handling

### API Errors

```typescript
// lib/api-client.ts — error handling
async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}
```

TanStack Query menangani retry (2x dengan exponential backoff default). Setelah semua retry gagal, `isError = true` dan komponen `BubbleChartError` dirender dengan tombol "Coba Lagi" yang memanggil `refetch()`.

### State Hierarchy

```
isLoading = true  → BubbleChartSkeleton (21 pulse circles)
isRefetching = true (data ada) → BubbleChart dengan opacity overlay 50%
isError = true    → BubbleChartError (menggantikan overlay jika keduanya terjadi)
success           → BubbleChart normal
```

### Tooltip Error

Jika `useHistorisKomoditas` gagal, tooltip tetap ditampilkan tanpa sparkline (graceful degradation — tidak crash seluruh tooltip).

---

## Testing Strategy

### Dual Testing Approach

M4 menggunakan kombinasi unit tests (example-based) dan property-based tests (PBT) dengan **fast-check**.

### Unit Tests (Example-Based)

Fokus pada:

- Konfigurasi QueryClient (staleTime, retry)
- Default state (timeframe = '1D', provinsiId = 0)
- Loading/error/success state rendering
- Event handling (klik timeframe, pilih provinsi, klik retry)
- Aksesibilitas (role="img", aria-label pada SVG)
- Footer selalu dirender

```
apps/web/
└── __tests__/
    ├── components/
    │   ├── bubble-chart.test.tsx
    │   ├── bubble-tooltip.test.tsx
    │   ├── timeframe-filter.test.tsx
    │   ├── provinsi-filter.test.tsx
    │   └── data-footer.test.tsx
    └── lib/
        ├── api-client.test.ts
        └── hooks/
            ├── use-komoditas.test.ts
            └── use-historis-komoditas.test.ts
```

### Property-Based Tests (fast-check)

Setiap property dari section Correctness Properties diimplementasikan sebagai satu property test dengan minimum **100 iterasi**.

```typescript
// Contoh: Property 3 — Bubble Position Clamping
import fc from 'fast-check'
import { clampBubblePosition } from '@/lib/bubble-utils'

// Feature: m4-bubble-chart, Property 3: Bubble position clamping invariant
test('bubble position clamping invariant', () => {
  fc.assert(
    fc.property(
      fc.float({ min: 100, max: 2000 }), // width
      fc.float({ min: 100, max: 1200 }), // height
      fc.float({ min: 30, max: 120 }), // radius
      fc.float({ min: -1000, max: 3000 }), // raw x
      fc.float({ min: -1000, max: 2000 }), // raw y
      (width, height, radius, rawX, rawY) => {
        const { x, y } = clampBubblePosition(rawX, rawY, radius, width, height)
        return x >= radius && x <= width - radius && y >= radius && y <= height - radius
      },
    ),
    { numRuns: 100 },
  )
})
```

Tag format untuk setiap property test:

```
// Feature: m4-bubble-chart, Property {N}: {property_text}
```

### Test Runner

```bash
# Jalankan semua tests (single run, bukan watch mode)
bun run test --run

# Atau via turbo
bun run test
```

Framework: **Vitest** (sudah kompatibel dengan Bun + Next.js ecosystem, tidak perlu setup tambahan yang kompleks).

```bash
bun add -d vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom --filter=@pantau-pangan/web
```

### Coverage Target

- Unit tests: semua komponen utama, semua hooks, API client
- Property tests: 9 properties × 100 iterasi minimum
- Tidak perlu 100% coverage — fokus pada logic yang bervariasi dengan input
