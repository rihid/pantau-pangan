// Feature: m4-bubble-chart, Property 6: Data Badge Display Logic

import fc from 'fast-check'
import { TIMEFRAME_DAYS } from '@pantau-pangan/shared'
import type { Timeframe } from '@pantau-pangan/shared'

/**
 * Property 6: Data Badge Display Logic
 * Validates: Requirements 6.3
 *
 * formatDataBadge returns a string when actualDays < TIMEFRAME_DAYS[timeframe],
 * and null when actualDays >= TIMEFRAME_DAYS[timeframe].
 */

function formatDataBadge(timeframe: Timeframe, actualDays: number): string | null {
  if (actualDays < TIMEFRAME_DAYS[timeframe]) {
    return `${timeframe} · ${actualDays}d`
  }
  return null
}

const timeframeArb = fc.constantFrom<Timeframe>('1D', '1W', '1M', '3M', '1Y')

describe('Property 6: Data Badge Display Logic', () => {
  test('returns string with timeframe and actualDays when actualDays < TIMEFRAME_DAYS', () => {
    fc.assert(
      fc.property(
        timeframeArb.chain((tf) =>
          fc.record({
            timeframe: fc.constant(tf),
            actualDays: fc.integer({ min: 0, max: TIMEFRAME_DAYS[tf] - 1 }),
          }),
        ),
        ({ timeframe, actualDays }) => {
          const result = formatDataBadge(timeframe, actualDays)
          if (result === null) return false
          return result.includes(timeframe) && result.includes(`${actualDays}d`)
        },
      ),
      { numRuns: 100 },
    )
  })

  test('returns null when actualDays >= TIMEFRAME_DAYS', () => {
    fc.assert(
      fc.property(
        timeframeArb.chain((tf) =>
          fc.record({
            timeframe: fc.constant(tf),
            actualDays: fc.integer({ min: TIMEFRAME_DAYS[tf], max: TIMEFRAME_DAYS[tf] + 1000 }),
          }),
        ),
        ({ timeframe, actualDays }) => {
          const result = formatDataBadge(timeframe, actualDays)
          return result === null
        },
      ),
      { numRuns: 100 },
    )
  })

  test('badge includes "0d" when actualDays is zero (edge case)', () => {
    const timeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']
    for (const tf of timeframes) {
      if (TIMEFRAME_DAYS[tf] > 0) {
        const result = formatDataBadge(tf, 0)
        expect(result).not.toBeNull()
        expect(result).toContain('0d')
      }
    }
  })
})
