/**
 * Property test for HistorisChart — HighLowMarker rendering.
 * Property 2: HighLowMarker is rendered iff filteredData.length >= 2.
 * Validates: Requirements 3.3, 3.4
 */

import fc from 'fast-check'
import { describe, test, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import type { HargaHarian } from '@pantau-pangan/shared'
import { filterByTimeframe } from '@/lib/modal-utils'

// Mock useHistorisModal so HistorisChart renders without network calls
vi.mock('@/lib/hooks/use-historis-modal')

// ResizeObserver mock that fires immediately with 300x200 dimensions
// This unblocks the D3 useEffect which requires width > 0
globalThis.ResizeObserver = class ResizeObserver {
  private cb: ResizeObserverCallback
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb
  }
  observe(_target: Element) {
    // Fire synchronously so state update happens before act() resolves
    this.cb([{ contentRect: { width: 300, height: 200 } } as ResizeObserverEntry], this)
  }
  unobserve() {}
  disconnect() {}
}

// NOTE: We do NOT mock D3 here — we let it run against real jsdom SVG.
// This is the only way the [data-marker="true"] attribute can actually be set.
// jsdom supports SVG element creation and attribute setting.

import { HistorisChart } from '@/components/modal/historis-chart'
import * as useHistorisModalModule from '@/lib/hooks/use-historis-modal'

/**
 * Helper: derive filteredData length as the chart does.
 * filterByTimeframe('1Y') returns data within 365 days from latest.
 * Since all generated dates are in 2024, all fall within that window.
 */
function getFilteredLength(data: HargaHarian[]): number {
  if (data.length === 0) return 0
  return filterByTimeframe(data, '1Y').length
}

describe('HistorisChart — Property 2: HighLowMarker Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Property 2: HighLowMarker Invariant
   * Validates: Requirements 3.3, 3.4
   *
   * - filteredData.length <= 1  → 0 elements with [data-marker="true"]
   * - filteredData.length >= 2  → exactly 2 elements with [data-marker="true"]
   */
  test('marker count matches filteredData length rule (0/1 pts → 0 markers; ≥2 pts → 2 markers)', () => {
    const mockUseHistorisModal = vi.spyOn(useHistorisModalModule, 'useHistorisModal')

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.nat(),
            komoditasId: fc.constant(1),
            level: fc.constant(0),
            provinsiId: fc.constant<null>(null),
            kotaId: fc.constant<null>(null),
            pasarId: fc.constant<null>(null),
            harga: fc.float({ min: 100, max: 200000, noNaN: true }),
            tanggal: fc
              .date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
              .filter((d) => !isNaN(d.getTime()))
              .map((d) => d.toISOString().split('T')[0] ?? '2024-01-01'),
          }),
          { minLength: 0, maxLength: 15 },
        ),
        (generatedData) => {
          mockUseHistorisModal.mockReturnValue({
            data: generatedData,
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
            status: 'success',
            fetchStatus: 'idle',
            isSuccess: true,
            isPending: false,
            error: null,
            dataUpdatedAt: 0,
            errorUpdatedAt: 0,
            failureCount: 0,
            failureReason: null,
            isFetched: true,
            isFetchedAfterMount: true,
            isFetching: false,
            isInitialLoading: false,
            isLoadingError: false,
            isPlaceholderData: false,
            isRefetchError: false,
            isRefetching: false,
            isStale: false,
            errorUpdateCount: 0,
            isPaused: false,
            isEnabled: true,
            promise: Promise.resolve(generatedData),
          } as unknown as ReturnType<typeof useHistorisModalModule.useHistorisModal>)

          let container!: HTMLElement
          let unmount!: () => void

          act(() => {
            const result = render(
              <HistorisChart komoditasId={1} timeframe="1Y" provinsiId={0} namaKomoditas="Test" />,
            )
            container = result.container
            unmount = result.unmount
          })

          const filteredLength = getFilteredLength(generatedData)
          const markers = container.querySelectorAll('[data-marker="true"]')

          let passed: boolean
          if (filteredLength <= 1) {
            passed = markers.length === 0
          } else {
            passed = markers.length === 2
          }

          unmount()
          return passed
        },
      ),
      { numRuns: 50 },
    )
  })
})
