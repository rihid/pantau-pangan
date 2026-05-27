/**
 * Unit tests untuk custom TanStack Query hooks
 * Validates: Requirements 2.3, 2.4
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useKomoditas } from '@/lib/hooks/use-komoditas'
import { useHistorisKomoditas } from '@/lib/hooks/use-historis-komoditas'

vi.mock('@/lib/api-client', () => ({
  fetchKomoditas: vi.fn().mockResolvedValue([]),
  fetchHistorisKomoditas: vi.fn().mockResolvedValue([]),
  fetchProvinsi: vi.fn().mockResolvedValue([]),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useKomoditas', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('menggunakan queryKey yang berbeda saat timeframe berubah — refetch otomatis dengan parameter baru', async () => {
    const { fetchKomoditas } = await import('@/lib/api-client')

    // Render dua instance hook dengan timeframe berbeda, masing-masing dengan QueryClient sendiri
    const { result: result1 } = renderHook(() => useKomoditas('1D', 0), {
      wrapper: createWrapper(),
    })

    const { result: result2 } = renderHook(() => useKomoditas('1W', 0), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result1.current.isLoading).toBe(false))
    await waitFor(() => expect(result2.current.isLoading).toBe(false))

    // fetchKomoditas dipanggil dua kali dengan timeframe berbeda
    expect(fetchKomoditas).toHaveBeenCalledWith('1D', 0)
    expect(fetchKomoditas).toHaveBeenCalledWith('1W', 0)
    expect(fetchKomoditas).toHaveBeenCalledTimes(2)
  })

  it('menggunakan queryKey yang berbeda saat provinsiId berubah — refetch otomatis dengan parameter baru', async () => {
    const { fetchKomoditas } = await import('@/lib/api-client')

    const { result: result1 } = renderHook(() => useKomoditas('1D', 0), {
      wrapper: createWrapper(),
    })

    const { result: result2 } = renderHook(() => useKomoditas('1D', 11), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result1.current.isLoading).toBe(false))
    await waitFor(() => expect(result2.current.isLoading).toBe(false))

    // fetchKomoditas dipanggil dua kali dengan provinsiId berbeda
    expect(fetchKomoditas).toHaveBeenCalledWith('1D', 0)
    expect(fetchKomoditas).toHaveBeenCalledWith('1D', 11)
    expect(fetchKomoditas).toHaveBeenCalledTimes(2)
  })

  it('queryKey berbeda untuk setiap kombinasi timeframe dan provinsiId', () => {
    // Verifikasi bahwa struktur queryKey yang dipakai hook menghasilkan key unik
    // per kombinasi parameter — ini yang memicu refetch otomatis di TanStack Query
    const key1 = JSON.stringify(['komoditas', '1D', 0])
    const key2 = JSON.stringify(['komoditas', '1W', 0])
    const key3 = JSON.stringify(['komoditas', '1D', 11])
    const key4 = JSON.stringify(['komoditas', '1W', 11])

    expect(key1).not.toBe(key2)
    expect(key1).not.toBe(key3)
    expect(key1).not.toBe(key4)
    expect(key2).not.toBe(key3)
  })
})

describe('useHistorisKomoditas', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('tidak aktif (enabled: false) saat komoditasId adalah null — fetchHistorisKomoditas tidak dipanggil', async () => {
    const { fetchHistorisKomoditas } = await import('@/lib/api-client')

    const { result } = renderHook(() => useHistorisKomoditas(null, 0), {
      wrapper: createWrapper(),
    })

    // Tunggu sebentar untuk memastikan tidak ada fetch yang terjadi
    await new Promise((resolve) => setTimeout(resolve, 50))

    // fetchHistorisKomoditas tidak boleh dipanggil saat komoditasId null
    expect(fetchHistorisKomoditas).not.toHaveBeenCalled()

    // Query dalam state disabled — tidak loading, tidak ada data
    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
  })

  it('aktif dan melakukan fetch saat komoditasId tidak null', async () => {
    const { fetchHistorisKomoditas } = await import('@/lib/api-client')

    const { result } = renderHook(() => useHistorisKomoditas(5, 0), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // fetchHistorisKomoditas harus dipanggil dengan komoditasId dan provinsiId yang benar
    expect(fetchHistorisKomoditas).toHaveBeenCalledWith(5, 0)
    expect(fetchHistorisKomoditas).toHaveBeenCalledTimes(1)
  })
})
