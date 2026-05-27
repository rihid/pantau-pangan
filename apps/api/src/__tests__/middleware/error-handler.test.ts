import { describe, it, expect } from 'bun:test'
import fc from 'fast-check'
import { Hono } from 'hono'
import { errorHandler } from '../../middleware/error-handler'
import { ApiError } from '../../lib/validators'

/**
 * Validates: Requirements 7.1, 7.4, 7.5
 *
 * Property 9: Error Response Format Consistency
 * For any error condition (400, 404, 500, 502, 503), response body always has
 * exactly two fields: error (string) and status (number matching HTTP status).
 * 500 errors never contain stack trace, table names, or query details.
 */
describe('Feature: m3-api, Property 9: Error Response Format Consistency', () => {
  function createTestApp() {
    const app = new Hono()
    app.onError(errorHandler)

    // Route that throws ApiError with given status and message
    app.get('/api-error/:status', (c) => {
      const status = Number(c.req.param('status'))
      const message = c.req.query('message') ?? 'test error'
      throw new ApiError(status, message)
    })

    // Route that throws unknown error
    app.get('/unknown-error', () => {
      throw new Error('SELECT * FROM secret_table WHERE password = ...')
    })

    return app
  }

  it('ApiError responses always have exactly {error, status} fields', async () => {
    const app = createTestApp()

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(400, 404, 502, 503),
        fc.string({ minLength: 1, maxLength: 200 }),
        async (status, message) => {
          const res = await app.request(
            `/api-error/${status}?message=${encodeURIComponent(message)}`,
          )
          const body = (await res.json()) as Record<string, unknown>

          // Response has exactly 2 fields
          const keys = Object.keys(body)
          expect(keys).toHaveLength(2)
          expect(keys).toContain('error')
          expect(keys).toContain('status')

          // Status in body matches HTTP status
          expect(body.status).toBe(status)
          expect(res.status).toBe(status)

          // Error field is the message string
          expect(body.error).toBe(message)
        },
      ),
      { numRuns: 50 },
    )
  })

  it('500 errors never expose stack trace, table names, or query details', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'Error at Object.<anonymous> (/app/src/services/foo.ts:42:5)',
          'SELECT * FROM harga_harian WHERE id = 1',
          'relation "insight_cache" does not exist',
          'TypeError: Cannot read properties of undefined',
          'at processTicksAndRejections (node:internal/process/task_queues:95:5)',
        ),
        async (internalError) => {
          // Create app with route that throws the internal error
          const testApp = new Hono()
          testApp.onError(errorHandler)
          testApp.get('/crash', () => {
            throw new Error(internalError)
          })

          const res = await testApp.request('/crash')
          const body = (await res.json()) as Record<string, unknown>

          // Must be 500
          expect(res.status).toBe(500)
          expect(body.status).toBe(500)

          // Must have generic message, NOT the internal error
          expect(body.error).not.toContain(internalError)
          expect(String(body.error)).not.toContain('SELECT')
          expect(String(body.error)).not.toContain('FROM')
          expect(String(body.error)).not.toContain('.ts:')
          expect(String(body.error)).not.toContain('at ')

          // Must have exactly 2 fields
          expect(Object.keys(body)).toHaveLength(2)
        },
      ),
      { numRuns: 5 }, // Only 5 since we have 5 specific cases
    )
  })

  it('Content-Type is always application/json for error responses', async () => {
    const app = createTestApp()

    await fc.assert(
      fc.asyncProperty(fc.constantFrom(400, 404, 500, 502, 503), async (status) => {
        let res: Response
        if (status === 500) {
          const testApp = new Hono()
          testApp.onError(errorHandler)
          testApp.get('/err', () => {
            throw new Error('internal')
          })
          res = await testApp.request('/err')
        } else {
          res = await app.request(`/api-error/${status}?message=test`)
        }

        expect(res.headers.get('content-type')).toContain('application/json')
      }),
      { numRuns: 5 },
    )
  })
})
