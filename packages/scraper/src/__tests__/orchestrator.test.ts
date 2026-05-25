import { describe, test, expect } from 'bun:test'
import fc from 'fast-check'
import { mapLevelToFks } from '../level-mapping'

/**
 * Property 8: Level-to-FK mapping correctness
 * Validates: Requirements 8.7
 *
 * For any parsed grid row with a level in {0, 1, 2, 3}, the generated harga_harian
 * insert object SHALL have provinsi_id = null when level = 0, kota_id = null when
 * level ≤ 1, and pasar_id = null when level ≤ 2. Conversely, the non-null FK fields
 * SHALL be populated for their respective levels.
 */
describe('Property 8: Level-to-FK mapping correctness', () => {
  const posInt = fc.integer({ min: 1, max: 100_000 })

  test('Level 0: All FKs are null regardless of input values', () => {
    fc.assert(
      fc.property(
        fc.option(posInt, { nil: null }),
        fc.option(posInt, { nil: null }),
        fc.option(posInt, { nil: null }),
        (resolvedProvinsiId, resolvedKotaId, resolvedPasarId) => {
          const result = mapLevelToFks(0, resolvedProvinsiId, resolvedKotaId, resolvedPasarId)
          expect(result.provinsiId).toBeNull()
          expect(result.kotaId).toBeNull()
          expect(result.pasarId).toBeNull()
        },
      ),
      { numRuns: 100 },
    )
  })

  test('Level 1: Only provinsiId is set, rest are null', () => {
    fc.assert(
      fc.property(
        posInt,
        fc.option(posInt, { nil: null }),
        fc.option(posInt, { nil: null }),
        (resolvedProvinsiId, resolvedKotaId, resolvedPasarId) => {
          const result = mapLevelToFks(1, resolvedProvinsiId, resolvedKotaId, resolvedPasarId)
          expect(result.provinsiId).toBe(resolvedProvinsiId)
          expect(result.kotaId).toBeNull()
          expect(result.pasarId).toBeNull()
        },
      ),
      { numRuns: 100 },
    )
  })

  test('Level 2: provinsiId and kotaId are set, pasarId is null', () => {
    fc.assert(
      fc.property(
        posInt,
        posInt,
        fc.option(posInt, { nil: null }),
        (resolvedProvinsiId, resolvedKotaId, resolvedPasarId) => {
          const result = mapLevelToFks(2, resolvedProvinsiId, resolvedKotaId, resolvedPasarId)
          expect(result.provinsiId).toBe(resolvedProvinsiId)
          expect(result.kotaId).toBe(resolvedKotaId)
          expect(result.pasarId).toBeNull()
        },
      ),
      { numRuns: 100 },
    )
  })

  test('Level 3: All FKs are set', () => {
    fc.assert(
      fc.property(posInt, posInt, posInt, (resolvedProvinsiId, resolvedKotaId, resolvedPasarId) => {
        const result = mapLevelToFks(3, resolvedProvinsiId, resolvedKotaId, resolvedPasarId)
        expect(result.provinsiId).toBe(resolvedProvinsiId)
        expect(result.kotaId).toBe(resolvedKotaId)
        expect(result.pasarId).toBe(resolvedPasarId)
      }),
      { numRuns: 100 },
    )
  })

  test('Unknown level (default): All FKs are null', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 1000 }),
        fc.option(posInt, { nil: null }),
        fc.option(posInt, { nil: null }),
        fc.option(posInt, { nil: null }),
        (level, resolvedProvinsiId, resolvedKotaId, resolvedPasarId) => {
          const result = mapLevelToFks(level, resolvedProvinsiId, resolvedKotaId, resolvedPasarId)
          expect(result.provinsiId).toBeNull()
          expect(result.kotaId).toBeNull()
          expect(result.pasarId).toBeNull()
        },
      ),
      { numRuns: 100 },
    )
  })
})
