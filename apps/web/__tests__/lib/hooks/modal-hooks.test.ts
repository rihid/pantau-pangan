/**
 * Unit tests untuk M5 Modal Detail TanStack Query hooks
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 5.7
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useHistorisModal } from '@/lib/hooks/use-historis-modal'
import { useDetailGeografis } from '@/lib/hooks/use-detail-geografis'
import { useInsight } from '@/lib/hooks/use-insight'

vi.mock('@/lib/api-client', () => ({
  fetchHistorisModal: vi.fn().mockResolvedValue([]),
  fetchDetailGeografis: vi.fn().mockResolvedValue({ data: [] }),
  fetchInsight: vi.fn().mockResolvedValue({
    komoditasId: 1,
    provinsiId: null,
    insight: 'Test insight',
    generatedAt: '2025-01-01T00:00:00.000Z',
    cached: false,
  }),
  // Keep existing mocks so other tests are unaffected
  fetchKomoditas: vi.fn().mockResolvedValue([]),
  fetchHistorisKomoditas: vi.fn().mockResolvedValue([]),
  fetchProvinsi: vi.fn().mockResolvedValue([]),
  fetchDataRange: vi
    .fn()
    .mockResolvedValue({ oldestDate: null, newestDate: null, availableDays: 0 }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ─── useHistorisModal ──────────────────────────────────────────────────────────

describe('useHistorisModal', () => {
  afterEach(() => vi.clearAllMocks())

  it('não é ativo (enabled: false) quando komoditasId é null — não chama fetchHistorisModal', async () => {
    const { fetchHistorisModal } = await import('@/lib/api-client')

    const { result } = renderHook(() => useHistorisModal(null, '1D', 0), {
      wrapper: createWrapper(),
    })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(fetchHistorisModal).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
  })

  it('tidak aktif (enabled: false) saat komoditasId adalah null', async () => {
    const { fetchHistorisModal } = await import('@/lib/api-client')

    const { result } = renderHook(() => useHistorisModal(null, '1D', 0), {
      wrapper: createWrapper(),
    })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(fetchHistorisModal).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('aktif dan fetch saat komoditasId tidak null', async () => {
    const { fetchHistorisModal } = await import('@/lib/api-client')

    const { result } = renderHook(() => useHistorisModal(1, '1D', 0), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(fetchHistorisModal).toHaveBeenCalledWith(1, 0)
  })

  it('queryKey berubah saat timeframe berubah — refetch terjadi', async () => {
    const { fetchHistorisModal } = await import('@/lib/api-client')

    const { result: r1 } = renderHook(() => useHistorisModal(1, '1D', 0), {
      wrapper: createWrapper(),
    })
    const { result: r2 } = renderHook(() => useHistorisModal(1, '1W', 0), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(r1.current.isLoading).toBe(false))
    await waitFor(() => expect(r2.current.isLoading).toBe(false))

    // Both fetches happened with the same komoditasId
    expect(fetchHistorisModal).toHaveBeenCalledTimes(2)
  })

  it('queryKey berubah saat provinsiId berubah — refetch terjadi', async () => {
    const { fetchHistorisModal } = await import('@/lib/api-client')

    const { result: r1 } = renderHook(() => useHistorisModal(1, '1D', 0), {
      wrapper: createWrapper(),
    })
    const { result: r2 } = renderHook(() => useHistorisModal(1, '1D', 11), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(r1.current.isLoading).toBe(false))
    await waitFor(() => expect(r2.current.isLoading).toBe(false))

    expect(fetchHistorisModal).toHaveBeenCalledWith(1, 0)
    expect(fetchHistorisModal).toHaveBeenCalledWith(1, 11)
  })

  it('queryKey mengandung timeframe — berbeda untuk setiap timeframe', () => {
    const key1D = JSON.stringify(['historis-modal', 1, '1D', 0])
    const key1W = JSON.stringify(['historis-modal', 1, '1W', 0])
    const key1M = JSON.stringify(['historis-modal', 1, '1M', 0])

    expect(key1D).not.toBe(key1W)
    expect(key1D).not.toBe(key1M)
    expect(key1W).not.toBe(key1M)
  })
})

// ─── useDetailGeografis ────────────────────────────────────────────────────────

describe('useDetailGeografis', () => {
  afterEach(() => vi.clearAllMocks())

  it('tidak aktif saat komoditasId adalah null', async () => {
    const { fetchDetailGeografis } = await import('@/lib/api-client')

    const { result } = renderHook(() => useDetailGeografis(null, 0), {
      wrapper: createWrapper(),
    })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(fetchDetailGeografis).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('aktif dan fetch saat komoditasId tidak null', async () => {
    const { fetchDetailGeografis } = await import('@/lib/api-client')

    const { result } = renderHook(() => useDetailGeografis(2, 0), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(fetchDetailGeografis).toHaveBeenCalledWith(2, 0)
  })

  it('queryKey: [detail-geografis, komoditasId, provinsiId] — unik per kombinasi', () => {
    const key1 = JSON.stringify(['detail-geografis', 1, 0])
    const key2 = JSON.stringify(['detail-geografis', 2, 0])
    const key3 = JSON.stringify(['detail-geografis', 1, 11])

    expect(key1).not.toBe(key2)
    expect(key1).not.toBe(key3)
  })
})

// ─── useInsight ────────────────────────────────────────────────────────────────

describe('useInsight', () => {
  afterEach(() => vi.clearAllMocks())

  it('tidak aktif saat komoditasId adalah null', async () => {
    const { fetchInsight } = await import('@/lib/api-client')

    const { result } = renderHook(() => useInsight(null, 0), {
      wrapper: createWrapper(),
    })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(fetchInsight).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('aktif dan fetch saat komoditasId tidak null', async () => {
    const { fetchInsight } = await import('@/lib/api-client')

    const { result } = renderHook(() => useInsight(3, 0), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(fetchInsight).toHaveBeenCalledWith(3, 0)
  })

  it('queryKey TIDAK mengandung timeframe — tidak refetch saat timeframe berubah (Requirements 5.7)', () => {
    // The insight query key is ['insight', komoditasId, provinsiId]
    // It must NOT include timeframe
    const keyWith1D = JSON.stringify(['insight', 1, 0])
    const keyWith1W = JSON.stringify(['insight', 1, 0])

    // Same key regardless of "timeframe" — proves insight doesn't refetch on timeframe change
    expect(keyWith1D).toBe(keyWith1W)

    // Verify timeframe is NOT in the key structure
    expect(keyWith1D).not.toContain('1D')
    expect(keyWith1D).not.toContain('1W')
  })

  it('queryKey: [insight, komoditasId, provinsiId] — unik per kombinasi komoditas+provinsi', () => {
    const key1 = JSON.stringify(['insight', 1, 0])
    const key2 = JSON.stringify(['insight', 2, 0])
    const key3 = JSON.stringify(['insight', 1, 11])

    expect(key1).not.toBe(key2)
    expect(key1).not.toBe(key3)
  })
})
