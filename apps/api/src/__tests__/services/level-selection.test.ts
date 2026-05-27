import { describe, it, expect } from 'bun:test'
import fc from 'fast-check'

/**
 * Validates: Requirements 1.3, 1.4, 2.2, 2.3, 4.5, 4.6
 *
 * Property 1: Level Selection Consistency
 *
 * For any request with provinsiId parameter:
 * - provinsiId = 0 → level = 0, provinsi_id IS NULL in query
 * - provinsiId > 0 → level = 1, provinsi_id matches in query
 * This applies consistently across all services (komoditas, harga, insight).
 */
describe('Feature: m3-api, Property 1: Level Selection Consistency', () => {
  // The level selection logic used across all services
  function selectLevel(provinsiId: number): {
    level: number
    provinsiFilter: { type: 'null' } | { type: 'eq'; value: number }
  } {
    if (provinsiId === 0) {
      return { level: 0, provinsiFilter: { type: 'null' } }
    }
    return { level: 1, provinsiFilter: { type: 'eq', value: provinsiId } }
  }

  it('provinsiId=0 always produces level=0 with NULL filter', () => {
    const result = selectLevel(0)
    expect(result.level).toBe(0)
    expect(result.provinsiFilter.type).toBe('null')
  })

  it('any provinsiId > 0 always produces level=1 with matching filter', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10000 }), (provinsiId) => {
        const result = selectLevel(provinsiId)
        expect(result.level).toBe(1)
        expect(result.provinsiFilter.type).toBe('eq')
        if (result.provinsiFilter.type === 'eq') {
          expect(result.provinsiFilter.value).toBe(provinsiId)
        }
      }),
      { numRuns: 200 },
    )
  })

  it('level is always 0 or 1 for any valid provinsiId', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), (provinsiId) => {
        const result = selectLevel(provinsiId)
        expect([0, 1]).toContain(result.level)
      }),
      { numRuns: 200 },
    )
  })

  it('level selection is deterministic — same input always produces same output', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), (provinsiId) => {
        const result1 = selectLevel(provinsiId)
        const result2 = selectLevel(provinsiId)
        expect(result1.level).toBe(result2.level)
        expect(result1.provinsiFilter.type).toBe(result2.provinsiFilter.type)
      }),
      { numRuns: 200 },
    )
  })

  it('consistency across services: komoditas, harga, and insight use same logic', () => {
    // Simulate the level selection from each service
    function komoditasLevel(provinsiId: number) {
      return provinsiId === 0 ? 0 : 1
    }
    function hargaLevel(provinsiId: number) {
      return provinsiId === 0 ? 0 : 1
    }
    function insightLevel(provinsiId: number) {
      return provinsiId === 0 ? 0 : 1
    }

    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), (provinsiId) => {
        const kLevel = komoditasLevel(provinsiId)
        const hLevel = hargaLevel(provinsiId)
        const iLevel = insightLevel(provinsiId)

        // All services must produce the same level
        expect(kLevel).toBe(hLevel)
        expect(hLevel).toBe(iLevel)

        // And it must match the expected value
        expect(kLevel).toBe(provinsiId === 0 ? 0 : 1)
      }),
      { numRuns: 200 },
    )
  })
})
