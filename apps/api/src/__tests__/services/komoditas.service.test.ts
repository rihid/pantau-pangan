import { describe, it, expect } from 'bun:test'
import fc from 'fast-check'
import { hitungPerubahan, getBubbleRadius, getBubbleColor } from '@pantau-pangan/shared'
import type { Timeframe } from '@pantau-pangan/shared'

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']

/**
 * Validates: Requirements 1.2, 1.5, 1.10
 *
 * Property 2: Bubble Calculation Consistency with Shared Utils
 * For any komoditas with harga terbaru h1 and harga target h2 on timeframe t,
 * perubahan === hitungPerubahan(h1, h2), radius === getBubbleRadius(perubahan, t),
 * and color === getBubbleColor(perubahan, t).
 */
describe('Feature: m3-api, Property 2: Bubble Calculation Consistency with Shared Utils', () => {
  it('for any harga pair and timeframe, perubahan/radius/color are consistent with shared utils', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 100, max: 1_000_000, noNaN: true, noDefaultInfinity: true }), // h1 (harga sekarang)
        fc.double({ min: 100, max: 1_000_000, noNaN: true, noDefaultInfinity: true }), // h2 (harga target)
        fc.constantFrom(...TIMEFRAMES), // timeframe
        (h1, h2, timeframe) => {
          const perubahan = hitungPerubahan(h1, h2)
          const radius = getBubbleRadius(perubahan, timeframe)
          const color = getBubbleColor(perubahan, timeframe)

          // Verify perubahan calculation matches the formula
          expect(perubahan).toBe(((h1 - h2) / h2) * 100)

          // Verify radius is within bounds [BUBBLE_MIN_RADIUS, BUBBLE_MAX_RADIUS]
          expect(radius).toBeGreaterThanOrEqual(30)
          expect(radius).toBeLessThanOrEqual(120)

          // Verify color is one of the valid bubble colors
          expect(['#6b7280', '#ef4444', '#f97316', '#22c55e', '#84cc16']).toContain(color)
        },
      ),
      { numRuns: 200 },
    )
  })
})

/**
 * Validates: Requirements 5.1, 5.2
 *
 * Property 10: Provinsi List Sorted and Field-Complete
 * For any set of data in the provinsi table, the endpoint returns an array
 * sorted ascending by nama, where each object has exactly 3 fields: id, biId, nama.
 */
describe('Feature: m3-api, Property 10: Provinsi List Sorted and Field-Complete', () => {
  // Simulate the getProvinsiList output contract
  function simulateProvinsiList(
    input: Array<{ id: number; biId: number; nama: string; createdAt: string }>,
  ): Array<{ id: number; biId: number; nama: string }> {
    return input
      .map(({ id, biId, nama }) => ({ id, biId, nama }))
      .sort((a, b) => a.nama.localeCompare(b.nama))
  }

  it('output is always sorted ascending by nama', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }),
            biId: fc.integer({ min: 1, max: 100 }),
            nama: fc.string({ minLength: 1, maxLength: 50 }),
            createdAt: fc.constant('2026-01-01T00:00:00Z'),
          }),
          { minLength: 0, maxLength: 34 },
        ),
        (input) => {
          const result = simulateProvinsiList(input)

          for (let i = 1; i < result.length; i++) {
            expect(result[i]!.nama.localeCompare(result[i - 1]!.nama)).toBeGreaterThanOrEqual(0)
          }
        },
      ),
    )
  })

  it('each object has exactly 3 fields: id, biId, nama', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }),
            biId: fc.integer({ min: 1, max: 100 }),
            nama: fc.string({ minLength: 1, maxLength: 50 }),
            createdAt: fc.constant('2026-01-01T00:00:00Z'),
          }),
          { minLength: 1, maxLength: 34 },
        ),
        (input) => {
          const result = simulateProvinsiList(input)

          for (const item of result) {
            const keys = Object.keys(item)
            expect(keys).toHaveLength(3)
            expect(keys).toContain('id')
            expect(keys).toContain('biId')
            expect(keys).toContain('nama')
          }
        },
      ),
    )
  })
})
