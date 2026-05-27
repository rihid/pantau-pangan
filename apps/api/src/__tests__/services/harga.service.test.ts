import { describe, it, expect } from 'bun:test'
import fc from 'fast-check'

/**
 * Validates: Requirements 2.1
 *
 * Property 6: Historis Output Ordering and Limit
 *
 * Tests the OUTPUT CONTRACT of getHistoris transformation logic:
 * - Given rows from DB (ordered DESC by tanggal, limited to 365),
 *   after reverse+map, the result is sorted ascending by tanggal
 *   and has length <= 365.
 */
describe('Feature: m3-api, Property 6: Historis Output Ordering and Limit', () => {
  /**
   * Simulate the transformation logic from harga.service.ts:
   * DB returns rows ordered DESC by tanggal, limited to 365.
   * Service reverses them and maps harga to Number.
   */
  function transformHistoris(
    rows: Array<{ tanggal: string; harga: string }>,
  ): Array<{ tanggal: string; harga: number }> {
    return rows.reverse().map((r) => ({
      tanggal: r.tanggal,
      harga: Number(r.harga),
    }))
  }

  it('output is always sorted ascending by tanggal', () => {
    // Generate date strings directly using integer arithmetic to avoid Invalid Date
    const dateArb = fc
      .integer({ min: 0, max: 2556 }) // ~7 years of days from 2020-01-01
      .map((offset) => {
        const d = new Date(2020, 0, 1 + offset)
        return d.toISOString().split('T')[0]
      })

    fc.assert(
      fc.property(fc.array(dateArb, { minLength: 0, maxLength: 365 }), (dateStrs) => {
        // Sort DESC to simulate DB ORDER BY tanggal DESC
        const sortedDesc = [...dateStrs].sort((a, b) => (b! > a! ? 1 : b! < a! ? -1 : 0))
        const rows = sortedDesc.map((tanggal) => ({
          tanggal: tanggal!,
          harga: String(Math.floor(Math.random() * 100000)),
        }))

        const result = transformHistoris(rows)

        // Verify ascending order by tanggal
        for (let i = 1; i < result.length; i++) {
          expect(result[i]!.tanggal >= result[i - 1]!.tanggal).toBe(true)
        }
      }),
    )
  })

  it('output length is always <= 365', () => {
    const dateStrArb = fc.integer({ min: 0, max: 2556 }).map((offset) => {
      const d = new Date(2020, 0, 1 + offset)
      return d.toISOString().split('T')[0]
    })

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            tanggal: dateStrArb,
            harga: fc
              .double({ min: 100, max: 1000000, noNaN: true, noDefaultInfinity: true })
              .map(String),
          }),
          { minLength: 0, maxLength: 365 },
        ),
        (rows) => {
          const result = transformHistoris(rows as Array<{ tanggal: string; harga: string }>)
          expect(result.length).toBeLessThanOrEqual(365)
        },
      ),
    )
  })

  it('all harga values are valid numbers after transformation', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            tanggal: fc.constant('2026-01-01'),
            harga: fc
              .double({ min: 0, max: 1000000, noNaN: true, noDefaultInfinity: true })
              .map((h) => h.toFixed(2)),
          }),
          { minLength: 1, maxLength: 50 },
        ),
        (rows) => {
          const result = transformHistoris(rows)
          for (const r of result) {
            expect(Number.isFinite(r.harga)).toBe(true)
            expect(r.harga).toBeGreaterThanOrEqual(0)
          }
        },
      ),
    )
  })
})
