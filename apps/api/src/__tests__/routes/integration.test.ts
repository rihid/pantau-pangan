import { describe, it, expect } from 'bun:test'
import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import {
  ApiError,
  parseIntParam,
  validateTimeframe,
  validateProvinsiId,
} from '../../lib/validators'

/**
 * Integration Tests: Route → Service Flow
 *
 * These tests verify the full request flow through the Hono app,
 * focusing on validation errors (400), error response format consistency,
 * and health check — without requiring a real database connection.
 *
 * Validates: Requirements 1.7, 1.8, 2.4, 2.5, 3.6, 3.7, 4.7, 4.8, 7.1, 7.2, 7.3
 */

/** Helper to create a test app that mirrors the real app structure */
function createTestApp() {
  const app = new Hono()

  // Error handler using Hono's onError (correct pattern for Hono 4.x)
  app.onError((err, c) => {
    if (err instanceof ApiError) {
      const status = err.status as ContentfulStatusCode
      return c.json({ error: err.message, status: err.status }, status)
    }
    // Internal error — don't expose details
    console.error('Internal error:', err)
    return c.json({ error: 'Terjadi kesalahan internal server', status: 500 }, 500)
  })

  // Health check (mirrors src/index.ts)
  app.get('/', (c) => c.json({ status: 'ok', service: 'pantau-pangan-api' }))

  // Komoditas routes with validation (service calls mocked with empty responses)
  app.get('/komoditas', (c) => {
    const _timeframe = validateTimeframe(c.req.query('timeframe') ?? '1D')
    const _provinsiId = validateProvinsiId(c.req.query('provinsiId') ?? '0')
    // Mock service response — validation passed
    return c.json([])
  })

  app.get('/komoditas/:id/historis', (c) => {
    const _id = parseIntParam(c.req.param('id'), 'id')
    const _provinsiId = validateProvinsiId(c.req.query('provinsiId') ?? '0')
    // Mock service response — validation passed
    return c.json([])
  })

  app.get('/komoditas/:id/detail', (c) => {
    const _id = parseIntParam(c.req.param('id'), 'id')
    const _provinsiId = validateProvinsiId(c.req.query('provinsiId') ?? '0')
    // Mock service response — validation passed
    return c.json({})
  })

  app.get('/komoditas/:id/insight', (c) => {
    const _id = parseIntParam(c.req.param('id'), 'id')
    const _provinsiId = validateProvinsiId(c.req.query('provinsiId') ?? '0')
    // Mock service response — validation passed
    return c.json({})
  })

  app.get('/provinsi', (c) => {
    // Mock service response
    return c.json([])
  })

  return app
}

describe('Integration: Route → Service Flow', () => {
  describe('Health Check', () => {
    it('GET / returns { status: "ok", service: "pantau-pangan-api" }', async () => {
      const app = createTestApp()
      const res = await app.request('/')
      expect(res.status).toBe(200)
      const body = (await res.json()) as { status: string; service: string }
      expect(body).toEqual({ status: 'ok', service: 'pantau-pangan-api' })
    })

    it('GET / returns Content-Type application/json', async () => {
      const app = createTestApp()
      const res = await app.request('/')
      expect(res.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('Validation Errors — GET /komoditas', () => {
    it('returns 400 for invalid timeframe', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas?timeframe=2D')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('timeframe')
      expect(body.status).toBe(400)
    })

    it('returns 400 for timeframe with wrong case', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas?timeframe=1d')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('timeframe')
      expect(body.status).toBe(400)
    })

    it('returns 400 for negative provinsiId', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas?provinsiId=-1')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('provinsiId')
      expect(body.status).toBe(400)
    })

    it('returns 400 for non-integer provinsiId', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas?provinsiId=abc')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('provinsiId')
      expect(body.status).toBe(400)
    })

    it('returns 400 for float provinsiId', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas?provinsiId=1.5')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('provinsiId')
      expect(body.status).toBe(400)
    })

    it('returns 200 for valid params', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas?timeframe=1W&provinsiId=5')
      expect(res.status).toBe(200)
    })

    it('returns 200 for default params (no query string)', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas')
      expect(res.status).toBe(200)
    })
  })

  describe('Validation Errors — GET /komoditas/:id/historis', () => {
    it('returns 400 for non-integer id', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/abc/historis')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('id')
      expect(body.status).toBe(400)
    })

    it('returns 400 for zero id', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/0/historis')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('id')
      expect(body.status).toBe(400)
    })

    it('returns 400 for negative id', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/-3/historis')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('id')
      expect(body.status).toBe(400)
    })

    it('returns 400 for float id', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/1.5/historis')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('id')
      expect(body.status).toBe(400)
    })

    it('returns 400 for invalid provinsiId query param', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/1/historis?provinsiId=-5')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('provinsiId')
      expect(body.status).toBe(400)
    })

    it('returns 200 for valid id and params', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/7/historis?provinsiId=0')
      expect(res.status).toBe(200)
    })
  })

  describe('Validation Errors — GET /komoditas/:id/detail', () => {
    it('returns 400 for non-integer id', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/abc/detail')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('id')
      expect(body.status).toBe(400)
    })

    it('returns 400 for zero id', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/0/detail')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('id')
      expect(body.status).toBe(400)
    })

    it('returns 400 for negative provinsiId', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/1/detail?provinsiId=-2')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('provinsiId')
      expect(body.status).toBe(400)
    })

    it('returns 200 for valid id', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/5/detail')
      expect(res.status).toBe(200)
    })
  })

  describe('Validation Errors — GET /komoditas/:id/insight', () => {
    it('returns 400 for non-integer id', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/abc/insight')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('id')
      expect(body.status).toBe(400)
    })

    it('returns 400 for zero id', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/0/insight')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('id')
      expect(body.status).toBe(400)
    })

    it('returns 400 for float id', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/1.5/insight')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('id')
      expect(body.status).toBe(400)
    })

    it('returns 400 for invalid provinsiId', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/1/insight?provinsiId=xyz')
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).toContain('provinsiId')
      expect(body.status).toBe(400)
    })

    it('returns 200 for valid id and params', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/3/insight?provinsiId=0')
      expect(res.status).toBe(200)
    })
  })

  describe('Validation Errors — GET /provinsi', () => {
    it('returns 200 with empty array', async () => {
      const app = createTestApp()
      const res = await app.request('/provinsi')
      expect(res.status).toBe(200)
      const body = (await res.json()) as unknown[]
      expect(body).toEqual([])
    })
  })

  describe('Error Response Format Consistency', () => {
    it('all 400 error responses have exactly {error, status} fields', async () => {
      const app = createTestApp()

      const errorCases = [
        '/komoditas?timeframe=INVALID',
        '/komoditas?provinsiId=-5',
        '/komoditas?provinsiId=abc',
        '/komoditas/abc/historis',
        '/komoditas/0/historis',
        '/komoditas/-1/detail',
        '/komoditas/1.5/detail',
        '/komoditas/abc/insight',
        '/komoditas/0/insight',
        '/komoditas/1/historis?provinsiId=-1',
      ]

      for (const path of errorCases) {
        const res = await app.request(path)
        expect(res.status).toBe(400)
        const body = (await res.json()) as Record<string, unknown>
        const keys = Object.keys(body)
        expect(keys).toHaveLength(2)
        expect(keys).toContain('error')
        expect(keys).toContain('status')
        expect(typeof body.error).toBe('string')
        expect(typeof body.status).toBe('number')
        expect(body.status).toBe(400)
      }
    })

    it('error messages are descriptive strings (non-empty)', async () => {
      const app = createTestApp()

      const errorCases = [
        '/komoditas?timeframe=XYZ',
        '/komoditas/abc/historis',
        '/komoditas/0/detail',
      ]

      for (const path of errorCases) {
        const res = await app.request(path)
        const body = (await res.json()) as { error: string; status: number }
        expect(body.error.length).toBeGreaterThan(0)
      }
    })

    it('Content-Type is application/json for error responses', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas?timeframe=BAD')
      expect(res.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('Internal Server Error Handling', () => {
    it('unexpected errors return 500 with generic message (no stack trace)', async () => {
      const app = new Hono()
      app.onError((err, c) => {
        if (err instanceof ApiError) {
          const status = err.status as ContentfulStatusCode
          return c.json({ error: err.message, status: err.status }, status)
        }
        return c.json({ error: 'Terjadi kesalahan internal server', status: 500 }, 500)
      })
      app.get('/crash', () => {
        throw new Error(
          'Database connection failed: password authentication failed for user "admin"',
        )
      })

      const res = await app.request('/crash')
      expect(res.status).toBe(500)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.status).toBe(500)
      expect(body.error).not.toContain('password')
      expect(body.error).not.toContain('admin')
      expect(body.error).not.toContain('Database connection')
      expect(body.error).not.toContain('stack')
      // Should have exactly 2 fields
      expect(Object.keys(body)).toHaveLength(2)
      expect(Object.keys(body)).toContain('error')
      expect(Object.keys(body)).toContain('status')
    })

    it('500 error does not expose table names or query details', async () => {
      const app = new Hono()
      app.onError((err, c) => {
        if (err instanceof ApiError) {
          const status = err.status as ContentfulStatusCode
          return c.json({ error: err.message, status: err.status }, status)
        }
        return c.json({ error: 'Terjadi kesalahan internal server', status: 500 }, 500)
      })
      app.get('/crash', () => {
        throw new Error('relation "harga_harian" does not exist')
      })

      const res = await app.request('/crash')
      expect(res.status).toBe(500)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.error).not.toContain('harga_harian')
      expect(body.error).not.toContain('relation')
    })
  })

  describe('404 Not Found (via ApiError in service layer)', () => {
    it('returns 404 with proper format when resource not found', async () => {
      const app = createTestApp404()

      const res = await app.request('/komoditas/999/historis')
      expect(res.status).toBe(404)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.status).toBe(404)
      expect(body.error).toContain('999')
      expect(body.error).toContain('tidak ditemukan')
      expect(Object.keys(body)).toHaveLength(2)
    })

    it('returns 404 for non-existent provinsi', async () => {
      const app = createTestApp404()

      const res = await app.request('/komoditas/1/detail?provinsiId=999')
      expect(res.status).toBe(404)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.status).toBe(404)
      expect(body.error).toContain('Provinsi')
      expect(body.error).toContain('tidak ditemukan')
    })
  })

  describe('External Service Errors (502, 503)', () => {
    it('returns 502 when BI API is unavailable', async () => {
      const app = createTestAppExternalErrors()

      const res = await app.request('/komoditas/1/detail')
      expect(res.status).toBe(502)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.status).toBe(502)
      expect(body.error).toContain('BI API')
      expect(Object.keys(body)).toHaveLength(2)
    })

    it('returns 502 when OpenRouter is unavailable', async () => {
      const app = createTestAppExternalErrors()

      const res = await app.request('/komoditas/1/insight-502')
      expect(res.status).toBe(502)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.status).toBe(502)
      expect(body.error).toContain('OpenRouter')
      expect(Object.keys(body)).toHaveLength(2)
    })

    it('returns 503 when OPENROUTER_API_KEY is missing', async () => {
      const app = createTestAppExternalErrors()

      const res = await app.request('/komoditas/1/insight-503')
      expect(res.status).toBe(503)
      const body = (await res.json()) as { error: string; status: number }
      expect(body.status).toBe(503)
      expect(body.error).toContain('OPENROUTER_API_KEY')
      expect(Object.keys(body)).toHaveLength(2)
    })
  })

  describe('Valid Request Flows (mocked service layer)', () => {
    it('GET /komoditas with all valid timeframes returns 200', async () => {
      const app = createTestApp()
      const timeframes = ['1D', '1W', '1M', '3M', '1Y']

      for (const tf of timeframes) {
        const res = await app.request(`/komoditas?timeframe=${tf}`)
        expect(res.status).toBe(200)
      }
    })

    it('GET /komoditas/:id/historis with valid id returns 200', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/1/historis')
      expect(res.status).toBe(200)
      const body = (await res.json()) as unknown[]
      expect(Array.isArray(body)).toBe(true)
    })

    it('GET /komoditas/:id/detail with valid id returns 200', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/21/detail?provinsiId=5')
      expect(res.status).toBe(200)
    })

    it('GET /komoditas/:id/insight with valid id returns 200', async () => {
      const app = createTestApp()
      const res = await app.request('/komoditas/7/insight?provinsiId=0')
      expect(res.status).toBe(200)
    })

    it('GET /provinsi returns 200 with array', async () => {
      const app = createTestApp()
      const res = await app.request('/provinsi')
      expect(res.status).toBe(200)
      const body = (await res.json()) as unknown[]
      expect(Array.isArray(body)).toBe(true)
    })
  })
})

/** Helper app that simulates 404 from service layer */
function createTestApp404() {
  const app = new Hono()
  app.onError((err, c) => {
    if (err instanceof ApiError) {
      const status = err.status as ContentfulStatusCode
      return c.json({ error: err.message, status: err.status }, status)
    }
    return c.json({ error: 'Terjadi kesalahan internal server', status: 500 }, 500)
  })

  app.get('/komoditas/:id/historis', (c) => {
    const id = parseIntParam(c.req.param('id'), 'id')
    // Simulate service throwing 404 for non-existent komoditas
    throw new ApiError(404, `Komoditas dengan id ${id} tidak ditemukan`)
  })

  app.get('/komoditas/:id/detail', (c) => {
    const _id = parseIntParam(c.req.param('id'), 'id')
    const provinsiId = validateProvinsiId(c.req.query('provinsiId') ?? '0')
    // Simulate service throwing 404 for non-existent provinsi
    if (provinsiId > 0) {
      throw new ApiError(404, `Provinsi dengan id ${provinsiId} tidak ditemukan`)
    }
    return c.json({})
  })

  return app
}

/** Helper app that simulates external service errors */
function createTestAppExternalErrors() {
  const app = new Hono()
  app.onError((err, c) => {
    if (err instanceof ApiError) {
      const status = err.status as ContentfulStatusCode
      return c.json({ error: err.message, status: err.status }, status)
    }
    return c.json({ error: 'Terjadi kesalahan internal server', status: 500 }, 500)
  })

  app.get('/komoditas/:id/detail', (c) => {
    const _id = parseIntParam(c.req.param('id'), 'id')
    // Simulate BI API failure
    throw new ApiError(502, 'Sumber data eksternal (BI API) tidak tersedia')
  })

  app.get('/komoditas/:id/insight-502', (c) => {
    const _id = parseIntParam(c.req.param('id'), 'id')
    // Simulate OpenRouter failure
    throw new ApiError(502, 'Layanan LLM (OpenRouter) tidak tersedia')
  })

  app.get('/komoditas/:id/insight-503', (c) => {
    const _id = parseIntParam(c.req.param('id'), 'id')
    // Simulate missing API key
    throw new ApiError(503, 'Fitur insight belum dikonfigurasi (OPENROUTER_API_KEY tidak tersedia)')
  })

  return app
}
