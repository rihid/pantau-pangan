import { describe, test } from 'bun:test'
import fc from 'fast-check'
import { shouldRunScraper } from '../scheduler'

/**
 * Property 1: Retry Logic — Scraper dijalankan jika dan hanya jika data hari ini belum tersedia
 *
 * For any combination of todayDone ∈ {true, false} and runNumber ∈ {1, 2, 3},
 * shouldRunScraper(todayDone, runNumber) SHALL return true iff todayDone === false.
 * The runNumber value does NOT affect the result.
 *
 * Validates: Requirements 3.6
 */
describe('Property 1: shouldRunScraper returns true iff !todayDone', () => {
  test('shouldRunScraper(todayDone, runNumber) === !todayDone for all combinations', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.constantFrom(1 as const, 2 as const, 3 as const),
        (todayDone, runNumber) => {
          return shouldRunScraper(todayDone, runNumber) === !todayDone
        },
      ),
      { numRuns: 100 },
    )
  })
})
