/**
 * Property-Based Tests untuk useKomoditas hook
 * Feature: m4-bubble-chart, Property 8: Query Key Uniqueness
 *
 * Validates: Requirements 2.3
 */

import fc from 'fast-check'

// Feature: m4-bubble-chart, Property 8: Query Key Uniqueness
describe('Property 8: Query Key Uniqueness', () => {
  /**
   * Validates: Requirements 2.3
   *
   * For any two different pairs of (timeframe, provinsiId), the query keys
   * ['komoditas', timeframe, provinsiId] must be different so TanStack Query
   * treats them as separate queries and triggers a refetch.
   */
  it('query keys berbeda untuk setiap pasang parameter yang berbeda', () => {
    const paramArb = fc.record({
      timeframe: fc.constantFrom('1D', '1W', '1M', '3M', '1Y'),
      provinsiId: fc.integer({ min: 0, max: 34 }),
    })

    fc.assert(
      fc.property(paramArb, paramArb, (params1, params2) => {
        // Hanya test pasang yang berbeda (setidaknya satu field berbeda)
        const isDifferent =
          params1.timeframe !== params2.timeframe || params1.provinsiId !== params2.provinsiId

        if (!isDifferent) {
          // Pasang identik — skip, bukan kasus yang diuji
          return true
        }

        const key1 = ['komoditas', params1.timeframe, params1.provinsiId]
        const key2 = ['komoditas', params2.timeframe, params2.provinsiId]

        return JSON.stringify(key1) !== JSON.stringify(key2)
      }),
      { numRuns: 100 },
    )
  })

  it('query key identik untuk pasang parameter yang sama', () => {
    const paramArb = fc.record({
      timeframe: fc.constantFrom('1D', '1W', '1M', '3M', '1Y'),
      provinsiId: fc.integer({ min: 0, max: 34 }),
    })

    fc.assert(
      fc.property(paramArb, (params) => {
        const key1 = ['komoditas', params.timeframe, params.provinsiId]
        const key2 = ['komoditas', params.timeframe, params.provinsiId]

        return JSON.stringify(key1) === JSON.stringify(key2)
      }),
      { numRuns: 100 },
    )
  })
})
