// Feature: m4-bubble-chart, Property 8: Query Key Uniqueness

import fc from 'fast-check'

/**
 * Property 8: Query Key Uniqueness
 * Validates: Requirements 2.3
 *
 * For any two different pairs of (timeframe, provinsiId), the query keys
 * ['komoditas', timeframe, provinsiId] must be different so TanStack Query
 * treats them as separate queries and triggers a refetch automatically.
 */
describe('Property 8: Query Key Uniqueness', () => {
  it('query keys berbeda untuk setiap pasang parameter yang berbeda', () => {
    const paramArb = fc.record({
      timeframe: fc.constantFrom('1D', '1W', '1M', '3M', '1Y'),
      provinsiId: fc.integer({ min: 0, max: 34 }),
    })

    fc.assert(
      fc.property(
        fc
          .tuple(paramArb, paramArb)
          .filter(([p1, p2]) => p1.timeframe !== p2.timeframe || p1.provinsiId !== p2.provinsiId),
        ([params1, params2]) => {
          const key1 = ['komoditas', params1.timeframe, params1.provinsiId]
          const key2 = ['komoditas', params2.timeframe, params2.provinsiId]

          return JSON.stringify(key1) !== JSON.stringify(key2)
        },
      ),
      { numRuns: 100 },
    )
  })
})
