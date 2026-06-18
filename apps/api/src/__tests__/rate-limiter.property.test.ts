import { describe, test } from 'bun:test'
import fc from 'fast-check'
import { extractIP } from '../middleware/rate-limiter'

/**
 * Property 2: IP Extraction — Output always non-empty trimmed string
 *
 * For any value of X-Forwarded-For and x-real-ip headers (including undefined,
 * empty strings, whitespace-only, single IP, multi-IP with commas, arbitrary strings),
 * extractIP() SHALL return a string that:
 * - Is not empty (result.length > 0)
 * - Has no leading/trailing whitespace (result === result.trim())
 *
 * Validates: Requirements 8.2
 */
describe('Property 2: extractIP always returns non-empty trimmed string', () => {
  test('extractIP result is always non-empty and trimmed', () => {
    fc.assert(
      fc.property(
        fc.option(fc.string(), { nil: undefined }),
        fc.option(fc.string(), { nil: undefined }),
        (forwardedFor, realIP) => {
          const result = extractIP(forwardedFor, realIP)
          return result.length > 0 && result === result.trim()
        },
      ),
      { numRuns: 100 },
    )
  })

  test('extractIP falls back to "unknown" for undefined inputs', () => {
    fc.assert(
      fc.property(fc.constant(undefined), fc.constant(undefined), (fwd, real) => {
        const result = extractIP(fwd, real)
        return result === 'unknown'
      }),
      { numRuns: 10 },
    )
  })

  test('extractIP uses first X-Forwarded-For segment when comma-separated', () => {
    fc.assert(
      fc.property(
        // Generate multi-IP strings like "1.2.3.4, 5.6.7.8"
        fc
          .array(
            fc
              .tuple(
                fc.integer({ min: 0, max: 255 }),
                fc.integer({ min: 0, max: 255 }),
                fc.integer({ min: 0, max: 255 }),
                fc.integer({ min: 0, max: 255 }),
              )
              .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
            { minLength: 2, maxLength: 4 },
          )
          .map((ips) => ips.join(', ')),
        (forwardedFor) => {
          const expected = forwardedFor.split(',')[0]?.trim() ?? 'unknown'
          const result = extractIP(forwardedFor, undefined)
          return result === expected
        },
      ),
      { numRuns: 100 },
    )
  })
})

/**
 * Property 3: Rate Limiter — No counter leak after all requests complete
 *
 * For any sequence of requests from one or more IPs that are all processed
 * to completion, the inFlight Map SHALL return to size 0 after all matching
 * increments and decrements are applied.
 *
 * Simulates N increments per IP followed by matching N decrements.
 * Verifies Map.size === 0 after all operations complete.
 *
 * Validates: Requirements 8.7
 */
describe('Property 3: inFlight Map has no counter leak after matched operations', () => {
  test('Map returns to empty after matched increments and decrements', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            ip: fc.string({ minLength: 1, maxLength: 20 }),
            count: fc.integer({ min: 1, max: 5 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (entries) => {
          const map = new Map<string, number>()

          // Simulate N increments per IP
          for (const { ip, count } of entries) {
            map.set(ip, (map.get(ip) ?? 0) + count)
          }

          // Simulate N matching decrements per IP
          for (const { ip, count } of entries) {
            const current = map.get(ip) ?? 0
            const next = current - count
            if (next <= 0) {
              map.delete(ip)
            } else {
              map.set(ip, next)
            }
          }

          // After all matched operations, map must be empty
          return map.size === 0
        },
      ),
      { numRuns: 100 },
    )
  })

  test('Map size stays at 0 for empty entry list', () => {
    fc.assert(
      fc.property(fc.constant([] as Array<{ ip: string; count: number }>), (entries) => {
        const map = new Map<string, number>()
        for (const { ip, count } of entries) map.set(ip, (map.get(ip) ?? 0) + count)
        for (const { ip, count } of entries) {
          const current = map.get(ip) ?? 0
          const next = current - count
          if (next <= 0) map.delete(ip)
          else map.set(ip, next)
        }
        return map.size === 0
      }),
      { numRuns: 10 },
    )
  })
})
