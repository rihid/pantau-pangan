/**
 * Unit tests for HistorisChart component.
 * Tests loading, error, empty, and aria-label states.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { HargaHarian } from '@pantau-pangan/shared'

// Mock useHistorisModal
vi.mock('@/lib/hooks/use-historis-modal')

// Mock recharts so tests run reliably in jsdom
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

// Mock ResizeObserver
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    callback: ResizeObserverCallback
    constructor(cb: ResizeObserverCallback) {
      this.callback = cb
    }
    observe(_target: Element) {
      this.callback([{ contentRect: { width: 300, height: 200 } } as ResizeObserverEntry], this)
    }
    unobserve() {}
    disconnect() {}
  }
}

import { HistorisChart } from '@/components/modal/historis-chart'
import * as useHistorisModalModule from '@/lib/hooks/use-historis-modal'

function mockHook(override: Partial<ReturnType<typeof useHistorisModalModule.useHistorisModal>>) {
  vi.spyOn(useHistorisModalModule, 'useHistorisModal').mockReturnValue({
    data: undefined,
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
    promise: Promise.resolve(undefined as unknown as HargaHarian[]),
    ...override,
  } as ReturnType<typeof useHistorisModalModule.useHistorisModal>)
}

const defaultProps = {
  komoditasId: 1,
  timeframe: '1Y' as const,
  provinsiId: 0,
  namaKomoditas: 'Beras Medium I',
}

describe('HistorisChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('1. loading state — renders skeleton (animate-pulse element)', () => {
    mockHook({
      isLoading: true,
      data: undefined,
      isError: false,
      status: 'pending',
      isPending: true,
      isSuccess: false,
    })

    const { container } = render(<HistorisChart {...defaultProps} />)

    // HistorisChartSkeleton renders an element with animate-pulse
    const pulse = container.querySelector('.animate-pulse')
    expect(pulse).not.toBeNull()
  })

  test('2. error state — "Coba lagi" button present and calls refetch on click', () => {
    const refetchMock = vi.fn().mockResolvedValue({})
    mockHook({
      isLoading: false,
      isError: true,
      data: undefined,
      status: 'error',
      isSuccess: false,
      error: new Error('Network error'),
      refetch: refetchMock,
    })

    render(<HistorisChart {...defaultProps} />)

    const retryButton = screen.getByRole('button', { name: /coba lagi/i })
    expect(retryButton).toBeInTheDocument()

    fireEvent.click(retryButton)
    expect(refetchMock).toHaveBeenCalledTimes(1)
  })

  test('3. empty state — shows "Data historis belum tersedia"', () => {
    mockHook({ isLoading: false, isError: false, data: [] })

    render(<HistorisChart {...defaultProps} />)

    expect(screen.getByText(/data historis belum tersedia/i)).toBeInTheDocument()
  })

  test('4. aria-label contains namaKomoditas', () => {
    const fiveDays: HargaHarian[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      komoditasId: 1,
      level: 0,
      provinsiId: null,
      kotaId: null,
      pasarId: null,
      harga: 10000 + i * 500,
      tanggal: `2024-${String(i + 1).padStart(2, '0')}-01`,
    }))

    mockHook({ isLoading: false, isError: false, data: fiveDays })

    const { container } = render(<HistorisChart {...defaultProps} namaKomoditas="Beras Medium I" />)

    const wrapper = container.querySelector('[role="img"]')
    expect(wrapper).not.toBeNull()
    expect(wrapper?.getAttribute('aria-label')).toContain('Beras Medium I')
  })
})
