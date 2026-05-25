import { describe, test, expect } from 'bun:test'
import fc from 'fast-check'
import { hitungPerubahan, getBubbleColor, getBubbleRadius, parseDateKeys } from '../utils'
import { VOLATILITY_THRESHOLDS, BUBBLE_MIN_RADIUS, BUBBLE_MAX_RADIUS } from '../constants'
import type { Timeframe } from '../types'

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']
const VALID_COLORS = ['#6b7280', '#ef4444', '#f97316', '#22c55e', '#84cc16']

const timeframeArb = fc.constantFrom(...TIMEFRAMES)

/**
 * Property 1: hitungPerubahan formula correctness
 * Validates: Requirements 5.1
 */
describe('Property 1: hitungPerubahan formula correctness', () => {
  test('for any hargaSekarang and non-zero hargaTarget, result equals ((hargaSekarang - hargaTarget) / hargaTarget) * 100', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        (hargaSekarang, hargaTarget) => {
          const result = hitungPerubahan(hargaSekarang, hargaTarget)
          const expected = ((hargaSekarang - hargaTarget) / hargaTarget) * 100
          expect(Math.abs(result - expected)).toBeLessThan(1e-10)
        },
      ),
      { numRuns: 100 },
    )
  })

  test('when hargaSekarang === hargaTarget, result is 0', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        (harga) => {
          const result = hitungPerubahan(harga, harga)
          expect(result).toBe(0)
        },
      ),
      { numRuns: 100 },
    )
  })
})

/**
 * Property 2: getBubbleColor threshold consistency
 * Validates: Requirements 5.2
 */
describe('Property 2: getBubbleColor threshold consistency', () => {
  test('always returns one of the 5 valid hex colors', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -200, max: 200, noNaN: true, noDefaultInfinity: true }),
        timeframeArb,
        (persen, timeframe) => {
          const color = getBubbleColor(persen, timeframe)
          expect(VALID_COLORS).toContain(color)
        },
      ),
      { numRuns: 100 },
    )
  })

  test('|persen| < stable/5 returns gray (#6b7280)', () => {
    fc.assert(
      fc.property(timeframeArb, (timeframe) => {
        const { stable } = VOLATILITY_THRESHOLDS[timeframe]
        const threshold = stable / 5
        // Generate a value within the stable zone
        const persen = threshold * 0.5 // half of the threshold, guaranteed < threshold
        const color = getBubbleColor(persen, timeframe)
        expect(color).toBe('#6b7280')
        // Also test negative side
        const colorNeg = getBubbleColor(-persen, timeframe)
        expect(colorNeg).toBe('#6b7280')
      }),
      { numRuns: 100 },
    )
  })

  test('persen >= significant returns red (#ef4444)', () => {
    fc.assert(
      fc.property(
        timeframeArb,
        fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        (timeframe, extra) => {
          const { significant } = VOLATILITY_THRESHOLDS[timeframe]
          const persen = significant + extra
          const color = getBubbleColor(persen, timeframe)
          expect(color).toBe('#ef4444')
        },
      ),
      { numRuns: 100 },
    )
  })

  test('0 < persen < significant returns orange (#f97316)', () => {
    fc.assert(
      fc.property(
        timeframeArb,
        fc.double({ min: 0.01, max: 0.99, noNaN: true, noDefaultInfinity: true }),
        (timeframe, ratio) => {
          const { stable, significant } = VOLATILITY_THRESHOLDS[timeframe]
          const lowerBound = stable / 5
          // Generate persen in range [lowerBound, significant)
          const persen = lowerBound + ratio * (significant - lowerBound - 0.0001)
          if (persen > 0 && persen < significant && Math.abs(persen) >= stable / 5) {
            const color = getBubbleColor(persen, timeframe)
            expect(color).toBe('#f97316')
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  test('persen <= -significant returns green (#22c55e)', () => {
    fc.assert(
      fc.property(
        timeframeArb,
        fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        (timeframe, extra) => {
          const { significant } = VOLATILITY_THRESHOLDS[timeframe]
          const persen = -(significant + extra)
          const color = getBubbleColor(persen, timeframe)
          expect(color).toBe('#22c55e')
        },
      ),
      { numRuns: 100 },
    )
  })

  test('-significant < persen < 0 (outside stable zone) returns light green (#84cc16)', () => {
    fc.assert(
      fc.property(
        timeframeArb,
        fc.double({ min: 0.01, max: 0.99, noNaN: true, noDefaultInfinity: true }),
        (timeframe, ratio) => {
          const { stable, significant } = VOLATILITY_THRESHOLDS[timeframe]
          const lowerBound = stable / 5
          // Generate persen in range (-significant, -lowerBound]
          const persen = -(lowerBound + ratio * (significant - lowerBound - 0.0001))
          if (persen < 0 && persen > -significant && Math.abs(persen) >= stable / 5) {
            const color = getBubbleColor(persen, timeframe)
            expect(color).toBe('#84cc16')
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})

/**
 * Property 3: getBubbleRadius bounds and monotonicity
 * Validates: Requirements 5.3
 */
describe('Property 3: getBubbleRadius bounds and monotonicity', () => {
  test('result is always >= BUBBLE_MIN_RADIUS (30)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -200, max: 200, noNaN: true, noDefaultInfinity: true }),
        timeframeArb,
        (persen, timeframe) => {
          const radius = getBubbleRadius(persen, timeframe)
          expect(radius).toBeGreaterThanOrEqual(BUBBLE_MIN_RADIUS)
        },
      ),
      { numRuns: 100 },
    )
  })

  test('result is always <= BUBBLE_MAX_RADIUS (120)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -200, max: 200, noNaN: true, noDefaultInfinity: true }),
        timeframeArb,
        (persen, timeframe) => {
          const radius = getBubbleRadius(persen, timeframe)
          expect(radius).toBeLessThanOrEqual(BUBBLE_MAX_RADIUS)
        },
      ),
      { numRuns: 100 },
    )
  })

  test('for same timeframe: |persen1| > |persen2| implies radius1 >= radius2 (monotonically non-decreasing)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 200, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 200, noNaN: true, noDefaultInfinity: true }),
        timeframeArb,
        (abs1, abs2, timeframe) => {
          const larger = Math.max(abs1, abs2)
          const smaller = Math.min(abs1, abs2)
          const radiusLarger = getBubbleRadius(larger, timeframe)
          const radiusSmaller = getBubbleRadius(smaller, timeframe)
          expect(radiusLarger).toBeGreaterThanOrEqual(radiusSmaller)
        },
      ),
      { numRuns: 100 },
    )
  })
})

/**
 * Property 4: parseDateKeys filtering and ordering
 * Validates: Requirements 5.4
 */
describe('Property 4: parseDateKeys filtering and ordering', () => {
  // Arbitrary for valid DD/MM/YYYY date keys
  const dateKeyArb = fc
    .tuple(
      fc.integer({ min: 1, max: 28 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 2020, max: 2030 }),
    )
    .map(([d, m, y]) => `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`)

  // Arbitrary for non-date keys
  const nonDateKeyArb = fc.oneof(
    fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !/^\d{2}\/\d{2}\/\d{4}$/.test(s)),
    fc.constantFrom('id', 'name', 'category', 'level', 'total', 'avg_price'),
  )

  test('all returned keys match DD/MM/YYYY pattern', () => {
    fc.assert(
      fc.property(
        fc.array(dateKeyArb, { minLength: 0, maxLength: 10 }),
        fc.array(nonDateKeyArb, { minLength: 0, maxLength: 10 }),
        (dateKeys, nonDateKeys) => {
          const obj: Record<string, unknown> = {}
          for (const k of dateKeys) obj[k] = Math.random() * 100000
          for (const k of nonDateKeys) obj[k] = 'some value'

          const result = parseDateKeys(obj)
          for (const key of result) {
            expect(key).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  test('non-date keys are excluded from result', () => {
    fc.assert(
      fc.property(
        fc.array(dateKeyArb, { minLength: 0, maxLength: 10 }),
        fc.array(nonDateKeyArb, { minLength: 1, maxLength: 10 }),
        (dateKeys, nonDateKeys) => {
          const obj: Record<string, unknown> = {}
          for (const k of dateKeys) obj[k] = Math.random() * 100000
          for (const k of nonDateKeys) obj[k] = 'some value'

          const result = parseDateKeys(obj)
          for (const key of nonDateKeys) {
            if (!/^\d{2}\/\d{2}\/\d{4}$/.test(key)) {
              expect(result).not.toContain(key)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  test('result is sorted ascending (lexicographic)', () => {
    fc.assert(
      fc.property(fc.array(dateKeyArb, { minLength: 2, maxLength: 10 }), (dateKeys) => {
        const obj: Record<string, unknown> = {}
        for (const k of dateKeys) obj[k] = Math.random() * 100000

        const result = parseDateKeys(obj)
        for (let i = 1; i < result.length; i++) {
          expect(result[i]! >= result[i - 1]!).toBe(true)
        }
      }),
      { numRuns: 100 },
    )
  })

  test('result contains exactly the unique date keys from the input', () => {
    fc.assert(
      fc.property(
        fc.array(dateKeyArb, { minLength: 0, maxLength: 10 }),
        fc.array(nonDateKeyArb, { minLength: 0, maxLength: 5 }),
        (dateKeys, nonDateKeys) => {
          const obj: Record<string, unknown> = {}
          for (const k of dateKeys) obj[k] = Math.random() * 100000
          for (const k of nonDateKeys) obj[k] = 'some value'

          const result = parseDateKeys(obj)
          const expectedDateKeys = [...new Set(dateKeys)].sort()
          expect(result).toEqual(expectedDateKeys)
        },
      ),
      { numRuns: 100 },
    )
  })
})
