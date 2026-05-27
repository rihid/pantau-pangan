import { describe, expect, it } from 'bun:test'
import fc from 'fast-check'
import {
  ApiError,
  parseIntParam,
  validateTimeframe,
  validateProvinsiId,
  VALID_TIMEFRAMES,
} from '../../lib/validators'

describe('ApiError', () => {
  it('extends Error with status field', () => {
    const err = new ApiError(400, 'bad request')
    expect(err).toBeInstanceOf(Error)
    expect(err.status).toBe(400)
    expect(err.message).toBe('bad request')
  })
})

describe('VALID_TIMEFRAMES', () => {
  it('contains exactly the 5 valid timeframes', () => {
    expect(VALID_TIMEFRAMES).toEqual(['1D', '1W', '1M', '3M', '1Y'])
  })
})

describe('parseIntParam', () => {
  it('returns parsed integer for valid positive integers', () => {
    expect(parseIntParam('1', 'id')).toBe(1)
    expect(parseIntParam('42', 'id')).toBe(42)
    expect(parseIntParam('100', 'id')).toBe(100)
  })

  it('throws ApiError(400) for zero', () => {
    expect(() => parseIntParam('0', 'id')).toThrow(ApiError)
    try {
      parseIntParam('0', 'id')
    } catch (e) {
      expect((e as ApiError).status).toBe(400)
      expect((e as ApiError).message).toContain('id')
    }
  })

  it('throws ApiError(400) for negative integers', () => {
    expect(() => parseIntParam('-1', 'id')).toThrow(ApiError)
  })

  it('throws ApiError(400) for non-integer values', () => {
    expect(() => parseIntParam('1.5', 'id')).toThrow(ApiError)
    expect(() => parseIntParam('abc', 'id')).toThrow(ApiError)
    expect(() => parseIntParam('', 'id')).toThrow(ApiError)
  })

  it('includes param name in error message', () => {
    try {
      parseIntParam('abc', 'komoditasId')
    } catch (e) {
      expect((e as ApiError).message).toContain('komoditasId')
    }
  })
})

describe('validateTimeframe', () => {
  it('returns valid timeframe values unchanged', () => {
    expect(validateTimeframe('1D')).toBe('1D')
    expect(validateTimeframe('1W')).toBe('1W')
    expect(validateTimeframe('1M')).toBe('1M')
    expect(validateTimeframe('3M')).toBe('3M')
    expect(validateTimeframe('1Y')).toBe('1Y')
  })

  it('throws ApiError(400) for invalid timeframe', () => {
    expect(() => validateTimeframe('2D')).toThrow(ApiError)
    try {
      validateTimeframe('2D')
    } catch (e) {
      expect((e as ApiError).status).toBe(400)
      expect((e as ApiError).message).toContain('timeframe')
      expect((e as ApiError).message).toContain('2D')
    }
  })

  it('throws ApiError(400) for empty string', () => {
    expect(() => validateTimeframe('')).toThrow(ApiError)
  })

  it('throws ApiError(400) for case-sensitive mismatch', () => {
    expect(() => validateTimeframe('1d')).toThrow(ApiError)
    expect(() => validateTimeframe('1w')).toThrow(ApiError)
  })
})

describe('validateProvinsiId', () => {
  it('returns 0 for "0" (nasional)', () => {
    expect(validateProvinsiId('0')).toBe(0)
  })

  it('returns parsed integer for valid non-negative integers', () => {
    expect(validateProvinsiId('1')).toBe(1)
    expect(validateProvinsiId('34')).toBe(34)
  })

  it('throws ApiError(400) for negative values', () => {
    expect(() => validateProvinsiId('-1')).toThrow(ApiError)
    try {
      validateProvinsiId('-1')
    } catch (e) {
      expect((e as ApiError).status).toBe(400)
      expect((e as ApiError).message).toContain('provinsiId')
    }
  })

  it('throws ApiError(400) for non-integer values', () => {
    expect(() => validateProvinsiId('1.5')).toThrow(ApiError)
    expect(() => validateProvinsiId('abc')).toThrow(ApiError)
  })

  it('treats empty string as 0 (nasional)', () => {
    // Number('') === 0, which is a valid non-negative integer
    expect(validateProvinsiId('')).toBe(0)
  })
})

/**
 * Property-Based Tests
 * Feature: m3-api, Property 4: Input Validation Rejects Invalid Params
 * Validates: Requirements 1.7, 1.8, 2.5, 2.6, 3.8, 3.10, 7.3
 */
describe('Property 4: Input Validation Rejects Invalid Params', () => {
  it('any string not in {1D,1W,1M,3M,1Y} → ApiError(400) with param name', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !['1D', '1W', '1M', '3M', '1Y'].includes(s)),
        (invalidTimeframe) => {
          try {
            validateTimeframe(invalidTimeframe)
            // Should not reach here
            throw new Error('Expected ApiError to be thrown')
          } catch (e) {
            expect(e).toBeInstanceOf(ApiError)
            expect((e as ApiError).status).toBe(400)
            expect((e as ApiError).message).toContain('timeframe')
          }
        },
      ),
    )
  })

  it('any non-integer or negative provinsiId → ApiError(400) with param name', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          const n = Number(s)
          return !Number.isInteger(n) || n < 0
        }),
        (invalidProvinsiId) => {
          try {
            validateProvinsiId(invalidProvinsiId)
            throw new Error('Expected ApiError to be thrown')
          } catch (e) {
            expect(e).toBeInstanceOf(ApiError)
            expect((e as ApiError).status).toBe(400)
            expect((e as ApiError).message).toContain('provinsiId')
          }
        },
      ),
    )
  })

  it('any non-positive-integer id → ApiError(400) with param name', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          const n = Number(s)
          return !Number.isInteger(n) || n < 1
        }),
        (invalidId) => {
          try {
            parseIntParam(invalidId, 'id')
            throw new Error('Expected ApiError to be thrown')
          } catch (e) {
            expect(e).toBeInstanceOf(ApiError)
            expect((e as ApiError).status).toBe(400)
            expect((e as ApiError).message).toContain('id')
          }
        },
      ),
    )
  })

  it('valid inputs pass through correctly', () => {
    // Valid timeframes pass through
    fc.assert(
      fc.property(fc.constantFrom('1D', '1W', '1M', '3M', '1Y'), (validTimeframe) => {
        expect(validateTimeframe(validTimeframe)).toBe(validTimeframe)
      }),
    )

    // Valid positive integers pass through parseIntParam
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10000 }), (validId) => {
        expect(parseIntParam(String(validId), 'id')).toBe(validId)
      }),
    )

    // Valid non-negative integers pass through validateProvinsiId
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), (validProvinsiId) => {
        expect(validateProvinsiId(String(validProvinsiId))).toBe(validProvinsiId)
      }),
    )
  })
})
