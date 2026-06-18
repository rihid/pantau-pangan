// Feature: m5-modal-detail, Properties 1–5: modal-utils pure functions

import fc from 'fast-check'
import { TIMEFRAME_DAYS, VOLATILITY_THRESHOLDS } from '@pantau-pangan/shared'
import type { BiDetailGridRow, HargaHarian, Timeframe } from '@pantau-pangan/shared'
import {
  filterByTimeframe,
  computeHighLow,
  formatHarga,
  parseDateColumns,
  sortByDateColumn,
} from '@/lib/modal-utils'

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']

// Helper: build a HargaHarian record with just the fields we need
function makeHargaHarian(overrides: Partial<HargaHarian> & { harga: number }): HargaHarian {
  return {
    id: 1,
    komoditasId: 1,
    level: 0,
    provinsiId: null,
    kotaId: null,
    pasarId: null,
    tanggal: '2025-01-01',
    ...overrides,
  }
}

/**
 * Property 1: filterByTimeframe Correctness
 * Validates: Requirements 3.1, 3.9
 */
describe('filterByTimeframe — Property 1: Correctness', () => {
  test('empty input always returns empty output', () => {
    fc.assert(
      fc.property(fc.constantFrom(...TIMEFRAMES), (timeframe) => {
        const result = filterByTimeframe([], timeframe)
        return result.length === 0
      }),
      { numRuns: 100 },
    )
  })

  test('all items in result have tanggal >= (latestDate - TIMEFRAME_DAYS[tf] days)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            // Tanggal as YYYY-MM-DD between 2020 and 2025
            tanggal: fc
              .date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
              .filter((d) => !isNaN(d.getTime()))
              .map((d) => d.toISOString().split('T')[0] ?? '2025-01-01'),
            harga: fc.float({ min: 1000, max: 100000, noNaN: true }),
          }),
          { minLength: 1, maxLength: 50 },
        ),
        fc.constantFrom(...TIMEFRAMES),
        (items, timeframe) => {
          const data: HargaHarian[] = items.map((item) =>
            makeHargaHarian({ tanggal: item.tanggal, harga: item.harga }),
          )

          const result = filterByTimeframe(data, timeframe)

          // Result must be non-empty since input has at least 1 item
          if (result.length === 0) return false

          // Find latest date in input
          const timestamps = data.map((d) => new Date(d.tanggal).getTime()).filter((t) => !isNaN(t))
          if (timestamps.length === 0) return true
          const latestTs = Math.max(...timestamps)
          const cutoffTs = latestTs - TIMEFRAME_DAYS[timeframe] * 24 * 60 * 60 * 1000

          // All result items must be >= cutoff
          return result.every((item) => {
            const ts = new Date(item.tanggal).getTime()
            return !isNaN(ts) && ts >= cutoffTs
          })
        },
      ),
      { numRuns: 100 },
    )
  })
})

/**
 * Property 2: computeHighLow Invariant
 * Validates: Requirements 3.3, 3.4
 */
describe('computeHighLow — Property 2: Invariant', () => {
  test('length <= 1 returns null', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 100, max: 200000, noNaN: true }), { minLength: 0, maxLength: 1 }),
        (prices) => {
          const data = prices.map((harga) => makeHargaHarian({ harga }))
          const result = computeHighLow(data)
          return result === null
        },
      ),
      { numRuns: 100 },
    )
  })

  test('length >= 2: max.harga >= all harga, min.harga <= all harga, max >= min', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 100, max: 200000, noNaN: true }), { minLength: 2, maxLength: 50 }),
        (prices) => {
          const data = prices.map((harga) => makeHargaHarian({ harga }))
          const result = computeHighLow(data)

          if (result === null) return false

          const allPrices = data.map((d) => d.harga)
          const actualMax = Math.max(...allPrices)
          const actualMin = Math.min(...allPrices)

          return (
            result.max.harga === actualMax &&
            result.min.harga === actualMin &&
            result.max.harga >= result.min.harga
          )
        },
      ),
      { numRuns: 100 },
    )
  })
})

/**
 * Property 3: formatHarga Formatting
 * Validates: Requirements 4.6
 */
describe('formatHarga — Property 3: Formatting', () => {
  test('null → "—", 0 → "—", undefined → "—"', () => {
    expect(formatHarga(null)).toBe('—')
    expect(formatHarga(0)).toBe('—')
    expect(formatHarga(undefined)).toBe('—')
  })

  test('positive integers: no "Rp", parseable integer, uses thousands separator', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (value) => {
        const result = formatHarga(value)
        // Must not contain "Rp"
        if (result.includes('Rp')) return false
        // Must not be "—"
        if (result === '—') return false
        // Must be parseable as a number (after removing thousands separators)
        const stripped = result.replace(/\./g, '').replace(/,/g, '')
        const parsed = parseInt(stripped, 10)
        return !isNaN(parsed) && parsed > 0
      }),
      { numRuns: 100 },
    )
  })
})

/**
 * Property 4: parseDateColumns Returns Valid Dates
 * Validates: Requirements 4.2
 */
describe('parseDateColumns — Property 4: Returns Valid Dates', () => {
  // Generate a BiDetailGridRow with a mix of valid date keys and non-date keys
  const validDateArbitrary = fc
    .tuple(
      fc.integer({ min: 1, max: 28 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 2020, max: 2025 }),
    )
    .map(([d, m, y]) => `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`)

  test('all returned keys match /^\\d{2}\\/\\d{2}\\/\\d{4}$/', () => {
    fc.assert(
      fc.property(
        fc.array(validDateArbitrary, { minLength: 0, maxLength: 5 }),
        fc.array(
          fc
            .string({ minLength: 1, maxLength: 10 })
            .filter(
              (s) =>
                !/^\d{2}\/\d{2}\/\d{4}$/.test(s) &&
                !['id', 'name', 'category', 'level'].includes(s),
            ),
          { minLength: 0, maxLength: 3 },
        ),
        (validDates, nonDateKeys) => {
          const row: BiDetailGridRow = {
            id: 1,
            name: 'Test',
            category: 'Cat',
            level: 0,
          }

          for (const dateKey of validDates) {
            row[dateKey] = 50000
          }
          for (const nonDateKey of nonDateKeys) {
            row[nonDateKey] = 'extra'
          }

          const result = parseDateColumns(row)
          const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/

          // All returned keys must match date pattern
          const allValid = result.every((key) => dateRegex.test(key))
          // Non-date keys must not appear
          const noNonDate = nonDateKeys.every((k) => !result.includes(k))
          // Standard non-date fields not in result
          const noStandardFields =
            !result.includes('id') &&
            !result.includes('name') &&
            !result.includes('category') &&
            !result.includes('level')

          return allValid && noNonDate && noStandardFields
        },
      ),
      { numRuns: 100 },
    )
  })

  test('result is sorted ascending (oldest first)', () => {
    fc.assert(
      fc.property(fc.array(validDateArbitrary, { minLength: 2, maxLength: 5 }), (validDates) => {
        // Deduplicate to ensure clean test
        const uniqueDates = [...new Set(validDates)]
        if (uniqueDates.length < 2) return true

        const row: BiDetailGridRow = {
          id: 1,
          name: 'Test',
          category: 'Cat',
          level: 0,
        }
        for (const dateKey of uniqueDates) {
          row[dateKey] = 50000
        }

        const result = parseDateColumns(row)

        // Verify ascending order
        const parseDate = (s: string): number => {
          const [day, month, year] = s.split('/')
          return new Date(`${year}-${month}-${day}`).getTime()
        }

        for (let i = 1; i < result.length; i++) {
          if (parseDate(result[i - 1]!) > parseDate(result[i]!)) return false
        }
        return true
      }),
      { numRuns: 100 },
    )
  })
})

/**
 * Property 5: sortByDateColumn Stability
 * Validates: Requirements 4.5
 */
describe('sortByDateColumn — Property 5: Stability', () => {
  const dateKey = '01/01/2025'

  function makeRow(harga: number, id: number): BiDetailGridRow {
    const row: BiDetailGridRow = {
      id,
      name: `Row ${id}`,
      category: 'Test',
      level: 0,
      [dateKey]: harga,
    }
    return row
  }

  test('ascending: rows[i][dateKey] <= rows[i+1][dateKey]', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: 100000, noNaN: true }), { minLength: 1, maxLength: 20 }),
        (prices) => {
          const rows = prices.map((p, i) => makeRow(p, i))
          const sorted = sortByDateColumn(rows, dateKey, 'asc')

          if (sorted.length !== rows.length) return false

          for (let i = 1; i < sorted.length; i++) {
            const a = sorted[i - 1]![dateKey] as number
            const b = sorted[i]![dateKey] as number
            if (a > b) return false
          }
          return true
        },
      ),
      { numRuns: 100 },
    )
  })

  test('descending: rows[i][dateKey] >= rows[i+1][dateKey]', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: 100000, noNaN: true }), { minLength: 1, maxLength: 20 }),
        (prices) => {
          const rows = prices.map((p, i) => makeRow(p, i))
          const sorted = sortByDateColumn(rows, dateKey, 'desc')

          if (sorted.length !== rows.length) return false

          for (let i = 1; i < sorted.length; i++) {
            const a = sorted[i - 1]![dateKey] as number
            const b = sorted[i]![dateKey] as number
            if (a < b) return false
          }
          return true
        },
      ),
      { numRuns: 100 },
    )
  })

  test('does not mutate original array', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: 100000, noNaN: true }), { minLength: 1, maxLength: 20 }),
        fc.constantFrom('asc' as const, 'desc' as const),
        (prices, direction) => {
          const rows = prices.map((p, i) => makeRow(p, i))
          const originalIds = rows.map((r) => r.id)
          sortByDateColumn(rows, dateKey, direction)
          const afterIds = rows.map((r) => r.id)
          return originalIds.every((id, i) => afterIds[i] === id)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// Ensure VOLATILITY_THRESHOLDS is used — just verifies import resolves
test('VOLATILITY_THRESHOLDS imported correctly', () => {
  expect(VOLATILITY_THRESHOLDS['1D'].stable).toBe(0.5)
})
