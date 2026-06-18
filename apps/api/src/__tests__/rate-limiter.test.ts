import { describe, test, expect, mock } from 'bun:test'

// Mock the DB module before importing rate-limiter
// This prevents actual DB connections during tests
void mock.module('../db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]), // default: no cache hit
        }),
      }),
    }),
  },
}))

void mock.module('../db/schema', () => ({
  insightCache: {
    id: 'id',
    komoditasId: 'komoditas_id',
    provinsiId: 'provinsi_id',
    cacheDate: 'cache_date',
  },
}))

void mock.module('drizzle-orm', () => ({
  and: (...args: unknown[]) => ({ type: 'and', args }),
  eq: (col: unknown, val: unknown) => ({ type: 'eq', col, val }),
  isNull: (col: unknown) => ({ type: 'isNull', col }),
}))

// Import after mocks are set up
const { rateLimiter, extractIP } = await import('../middleware/rate-limiter')

/** Creates a minimal Hono-like Context mock */
function makeContext(overrides: {
  paramId?: string
  queryProvinsiId?: string
  headerForwardedFor?: string
  headerRealIP?: string
}) {
  const { paramId = '1', queryProvinsiId = '0', headerForwardedFor, headerRealIP } = overrides

  return {
    req: {
      param: (name: string) => (name === 'id' ? paramId : undefined),
      query: (name: string) => (name === 'provinsiId' ? queryProvinsiId : undefined),
      header: (name: string) => {
        if (name === 'x-forwarded-for') return headerForwardedFor
        if (name === 'x-real-ip') return headerRealIP
        return undefined
      },
    },
    json: (body: unknown, status?: number) => ({ body, status: status ?? 200 }),
  }
}

describe('extractIP', () => {
  test('returns first segment of X-Forwarded-For', () => {
    expect(extractIP('1.2.3.4, 5.6.7.8', undefined)).toBe('1.2.3.4')
  })

  test('trims whitespace from X-Forwarded-For segments', () => {
    expect(extractIP('  10.0.0.1  , 10.0.0.2', undefined)).toBe('10.0.0.1')
  })

  test('falls back to x-real-ip when forwardedFor is undefined', () => {
    expect(extractIP(undefined, '192.168.1.1')).toBe('192.168.1.1')
  })

  test('falls back to "unknown" when both are undefined', () => {
    expect(extractIP(undefined, undefined)).toBe('unknown')
  })

  test('falls back to "unknown" when forwardedFor is empty string', () => {
    expect(extractIP('', undefined)).toBe('unknown')
  })

  test('falls back to x-real-ip when forwardedFor is empty after trim', () => {
    expect(extractIP('   ', '10.0.0.1')).toBe('10.0.0.1')
  })
})

describe('rateLimiter middleware', () => {
  test('extractIP is exported and is a function', () => {
    expect(typeof extractIP).toBe('function')
  })

  test('rateLimiter is exported and is a function', () => {
    expect(typeof rateLimiter).toBe('function')
  })

  test('first request from a new IP is forwarded (not 429)', async () => {
    const c = makeContext({ headerRealIP: 'test-ip-first-request' })
    let nextCalled = false
    const next = () => {
      nextCalled = true
      return Promise.resolve()
    }

    await rateLimiter(c as never, next)
    expect(nextCalled).toBe(true)
  })

  test('concurrent second request from same IP gets 429', async () => {
    const ip = 'test-ip-concurrent-429'
    const c = makeContext({ headerRealIP: ip })

    // Simulate a slow first request that hasn't completed
    let resolveFirst: () => void
    const firstDone = new Promise<void>((r) => {
      resolveFirst = r
    })

    let response429: { body: unknown; status: number } | null = null

    // Start first request (will be in-flight)
    const firstPromise = rateLimiter(c as never, () => firstDone)

    // Small delay to ensure first request has incremented counter
    await new Promise((r) => setTimeout(r, 10))

    // Second request from same IP — should get 429
    const c2 = {
      ...c,
      json: (body: unknown, status?: number) => {
        response429 = { body, status: status ?? 200 }
        return response429
      },
    }
    await rateLimiter(c2 as never, () => Promise.resolve())

    // Resolve first request
    resolveFirst!()
    await firstPromise

    expect(response429).not.toBeNull()
    expect((response429 as unknown as { body: unknown; status: number }).status).toBe(429)
    const body = (response429 as unknown as { body: unknown; status: number }).body as {
      error: string
      status: number
    }
    expect(body.error).toBe('Terlalu banyak request. Coba lagi sesaat.')
    expect(body.status).toBe(429)
  })

  test('counter is decremented in finally block even when handler throws', async () => {
    const ip = 'test-ip-throws'
    const c = makeContext({ headerRealIP: ip })

    let threwError = false
    try {
      await rateLimiter(c as never, () => {
        throw new Error('Handler error')
      })
    } catch {
      threwError = true
    }

    // After the throwing handler, counter should be back to 0
    // Verify: a new request from the same IP should be forwarded (not 429)
    let nextCalled = false
    await rateLimiter(c as never, () => {
      nextCalled = true
      return Promise.resolve()
    })

    expect(threwError).toBe(true)
    expect(nextCalled).toBe(true)
  })
})
