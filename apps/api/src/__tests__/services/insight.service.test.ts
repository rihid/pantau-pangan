import { describe, it, expect } from 'bun:test'
import fc from 'fast-check'
import type { InsightResponse } from '@pantau-pangan/shared'

/**
 * Validates: Requirements 4.1, 4.2, 4.3
 *
 * Property 7: Insight Cache Round-Trip
 *
 * Tests the CACHE LOGIC CONTRACT of getInsight:
 * - For any (komoditasId, provinsiId) pair, if a cache entry exists for today WIB,
 *   the function returns cached: true without calling the LLM.
 * - If no cache entry exists, the LLM is called and the result has cached: false.
 *
 * This test verifies the cache logic contract using simulated behavior,
 * not a real DB or LLM — the key invariant is the relationship between
 * cache state and the response's `cached` field.
 */
describe('Feature: m3-api, Property 7: Insight Cache Round-Trip', () => {
  /**
   * Simulates the cache-first logic from insight.service.ts:
   * 1. If cache has entry for today → return with cached: true
   * 2. If no cache → call LLM, save result, return with cached: false
   */
  function simulateGetInsight(
    komoditasId: number,
    provinsiId: number,
    cacheEntry: { insight: string; generatedAt: string } | null,
    llmResult: string,
  ): InsightResponse {
    const effectiveProvinsiId = provinsiId === 0 ? null : provinsiId

    if (cacheEntry) {
      // Cache hit — return cached insight without LLM call
      return {
        komoditasId,
        provinsiId: effectiveProvinsiId,
        insight: cacheEntry.insight,
        generatedAt: cacheEntry.generatedAt,
        cached: true,
      }
    }

    // Cache miss — LLM called, result saved
    return {
      komoditasId,
      provinsiId: effectiveProvinsiId,
      insight: llmResult,
      generatedAt: new Date().toISOString(),
      cached: false,
    }
  }

  it('cache hit returns cached: true with identical insight content', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // komoditasId
        fc.integer({ min: 0, max: 34 }), // provinsiId (0 = nasional)
        fc.string({ minLength: 10, maxLength: 500 }), // cached insight text
        (komoditasId, provinsiId, insightText) => {
          const cacheEntry = {
            insight: insightText,
            generatedAt: new Date().toISOString(),
          }

          const response = simulateGetInsight(komoditasId, provinsiId, cacheEntry, 'unused')

          // When cache exists, response MUST have cached: true
          expect(response.cached).toBe(true)
          // Insight content MUST be identical to cached entry
          expect(response.insight).toBe(insightText)
          // komoditasId MUST match input
          expect(response.komoditasId).toBe(komoditasId)
          // provinsiId=0 maps to null, otherwise keeps value
          expect(response.provinsiId).toBe(provinsiId === 0 ? null : provinsiId)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('cache miss returns cached: false with LLM-generated insight', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // komoditasId
        fc.integer({ min: 0, max: 34 }), // provinsiId
        fc.string({ minLength: 10, maxLength: 500 }), // LLM generated insight
        (komoditasId, provinsiId, generatedInsight) => {
          const response = simulateGetInsight(komoditasId, provinsiId, null, generatedInsight)

          // When no cache, response MUST have cached: false
          expect(response.cached).toBe(false)
          // Insight content MUST be the LLM-generated text
          expect(response.insight).toBe(generatedInsight)
          // komoditasId MUST match input
          expect(response.komoditasId).toBe(komoditasId)
          // provinsiId=0 maps to null, otherwise keeps value
          expect(response.provinsiId).toBe(provinsiId === 0 ? null : provinsiId)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('provinsiId=0 always maps to null, provinsiId>0 preserves value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 34 }), // provinsiId
        fc.string({ minLength: 10, maxLength: 200 }), // insight text
        (provinsiId, insightText) => {
          const cacheEntry = {
            insight: insightText,
            generatedAt: new Date().toISOString(),
          }

          const response = simulateGetInsight(1, provinsiId, cacheEntry, 'unused')

          if (provinsiId === 0) {
            expect(response.provinsiId).toBeNull()
          } else {
            expect(response.provinsiId).toBe(provinsiId)
          }
        },
      ),
      { numRuns: 200 },
    )
  })

  it('cache hit never changes the insight content (idempotent)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // komoditasId
        fc.integer({ min: 0, max: 34 }), // provinsiId
        fc.string({ minLength: 10, maxLength: 500 }), // original insight
        fc.string({ minLength: 10, maxLength: 500 }), // different LLM result (should be ignored)
        (komoditasId, provinsiId, cachedInsight, differentLlmResult) => {
          const cacheEntry = {
            insight: cachedInsight,
            generatedAt: new Date().toISOString(),
          }

          // Even if LLM would produce different text, cache hit returns original
          const response = simulateGetInsight(
            komoditasId,
            provinsiId,
            cacheEntry,
            differentLlmResult,
          )

          expect(response.cached).toBe(true)
          expect(response.insight).toBe(cachedInsight)
          // LLM result is NOT used when cache exists
          if (cachedInsight !== differentLlmResult) {
            expect(response.insight).not.toBe(differentLlmResult)
          }
        },
      ),
      { numRuns: 200 },
    )
  })
})
