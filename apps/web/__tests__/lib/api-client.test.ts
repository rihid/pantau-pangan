/**
 * Unit tests untuk API client
 * Validates: Requirements 1.5, 2.6
 */

describe('apiFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('melempar error saat response tidak ok (status 404)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: vi.fn(),
      }),
    )

    const { apiFetch } = await import('@/lib/api-client')

    await expect(apiFetch('/test')).rejects.toThrow('API error: 404 Not Found')
  })

  it('melempar error saat response tidak ok (status 500)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn(),
      }),
    )

    const { apiFetch } = await import('@/lib/api-client')

    await expect(apiFetch('/test')).rejects.toThrow('API error: 500 Internal Server Error')
  })

  it('melempar error saat response tidak ok (status 401)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: vi.fn(),
      }),
    )

    const { apiFetch } = await import('@/lib/api-client')

    await expect(apiFetch('/test')).rejects.toThrow('API error: 401 Unauthorized')
  })

  it('mengembalikan data saat response ok', async () => {
    const mockData = { id: 1, nama: 'Beras' }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockData),
      }),
    )

    const { apiFetch } = await import('@/lib/api-client')

    const result = await apiFetch('/test')
    expect(result).toEqual(mockData)
  })
})

describe('fetchKomoditas', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('membangun URL dengan query params timeframe dan provinsiId yang benar', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue([]),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { fetchKomoditas } = await import('@/lib/api-client')

    await fetchKomoditas('1W', 11)

    expect(mockFetch).toHaveBeenCalledOnce()
    const calledUrl: string = mockFetch.mock.calls[0]![0] as string
    expect(calledUrl).toContain('/komoditas')
    expect(calledUrl).toContain('timeframe=1W')
    expect(calledUrl).toContain('provinsiId=11')
  })

  it('membangun URL dengan timeframe 1D dan provinsiId 0 (nasional)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue([]),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { fetchKomoditas } = await import('@/lib/api-client')

    await fetchKomoditas('1D', 0)

    const calledUrl: string = mockFetch.mock.calls[0]![0] as string
    expect(calledUrl).toContain('timeframe=1D')
    expect(calledUrl).toContain('provinsiId=0')
  })

  it('membangun URL dengan semua nilai timeframe yang valid', async () => {
    const timeframes = ['1D', '1W', '1M', '3M', '1Y'] as const

    for (const tf of timeframes) {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue([]),
      })
      vi.stubGlobal('fetch', mockFetch)

      const { fetchKomoditas } = await import('@/lib/api-client')

      await fetchKomoditas(tf, 0)

      const calledUrl: string = mockFetch.mock.calls[0]![0] as string
      expect(calledUrl).toContain(`timeframe=${tf}`)

      vi.restoreAllMocks()
    }
  })
})

describe('API_BASE fallback', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('API_BASE menggunakan fallback localhost:3001 ketika env tidak tersedia', async () => {
    // Hapus env variable untuk simulasi tidak di-set
    const originalEnv = process.env.NEXT_PUBLIC_API_URL
    delete process.env.NEXT_PUBLIC_API_URL

    vi.resetModules()

    const { API_BASE } = await import('@/lib/api-client')

    expect(API_BASE).toBe('http://localhost:3001')

    // Restore
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_API_URL = originalEnv
    }
  })

  it('fetch menggunakan base URL yang mengandung localhost:3001 saat env tidak di-set', async () => {
    const originalEnv = process.env.NEXT_PUBLIC_API_URL
    delete process.env.NEXT_PUBLIC_API_URL

    vi.resetModules()

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue([]),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { apiFetch } = await import('@/lib/api-client')

    await apiFetch('/komoditas')

    const calledUrl: string = mockFetch.mock.calls[0]![0] as string
    expect(calledUrl).toContain('localhost:3001')
    expect(calledUrl).toBe('http://localhost:3001/komoditas')

    // Restore
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_API_URL = originalEnv
    }
  })

  it('menggunakan NEXT_PUBLIC_API_URL saat di-set', async () => {
    const originalEnv = process.env.NEXT_PUBLIC_API_URL
    process.env.NEXT_PUBLIC_API_URL = 'https://api.pantaupangan.id'

    vi.resetModules()

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue([]),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { apiFetch } = await import('@/lib/api-client')

    await apiFetch('/komoditas')

    const calledUrl: string = mockFetch.mock.calls[0]![0] as string
    expect(calledUrl).toBe('https://api.pantaupangan.id/komoditas')

    // Restore
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_API_URL = originalEnv
    } else {
      delete process.env.NEXT_PUBLIC_API_URL
    }
  })
})
