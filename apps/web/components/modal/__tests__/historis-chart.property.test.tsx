/**
 * Property test for HistorisChart — rendering invariant based on data length.
 * Property: Chart wrapper is rendered iff filteredData.length >= 2.
 */

import fc from 'fast-check'
import { describe, test, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import type { HargaHarian } from '@pantau-pangan/shared'
import { filterByTimeframe } from '@/lib/modal-utils'

// Mock useHistorisModal so HistorisChart renders without network calls
vi.mock('@/lib/hooks/use-historis-modal')

// Mock recharts for jsdom stability
vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div style={{ width: 400, height: 300 }}>{children}</div>
  ),
  ReferenceLine: () => null,
}))

// ResizeObserver mock
globalThis.ResizeObserver = class ResizeObserver {
  private cb: ResizeObserverCallback
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb
  }
  observe(_target: Element) {
    this.cb([{ contentRect: { width: 300, height: 200 } } as ResizeObserverEntry], this)
  }
  unobserve() {}
  disconnect() {}
}

import { HistorisChart } from '@/components/modal/historis-chart'
import * as useHistorisModalModule from '@/lib/hooks/use-historis-modal'

function getFilteredLength(data: HargaHarian[]): number {
  if (data.length === 0) return 0
  return filterByTimeframe(data, '1Y').length
}

describe('HistorisChart — Property: Rendered wrapper based on filteredData length', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('chart wrapper present iff filteredData.length >= 2; empty state otherwise', () => {
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
          const wrapper = container.querySelector('[role="img"]')
          const hasEmptyText =
            container.textContent?.includes('Data historis belum tersedia') ?? false

          let passed: boolean
          if (filteredLength === 0) {
            passed = wrapper === null && hasEmptyText
          } else {
            passed = wrapper !== null
          }

          unmount()
          return passed
        },
      ),
      { numRuns: 50 },
    )
  })
})
