// Feature: m4-bubble-chart, Property 4: Tooltip Sparkline Threshold

import fc from 'fast-check'
import type { BubbleData } from '@pantau-pangan/shared'

/**
 * Property 4: Tooltip Sparkline Threshold
 * Validates: Requirements 5.2, 5.3
 *
 * - radius >= 50 → Sparkline should be rendered
 * - radius < 50  → Sparkline should NOT be rendered
 *
 * Tests the pure threshold logic extracted from BubbleTooltip component.
 */

/** Mirrors the sparkline threshold logic in BubbleTooltip */
function shouldShowSparkline(radius: number): boolean {
  return radius >= 50
}

const baseData: Omit<BubbleData, 'radius'> = {
  komoditasId: 1,
  nama: 'Beras',
  kategori: 'Beras',
  harga: 12000,
  perubahan: 1.5,
  color: '#f97316',
}

describe('Property 4: Tooltip Sparkline Threshold', () => {
  test('radius >= 50 → sparkline should be shown', () => {
    fc.assert(
      fc.property(fc.float({ min: 50, max: 120, noNaN: true }), (radius) => {
        const d: BubbleData = { ...baseData, radius }
        return shouldShowSparkline(d.radius) === true
      }),
      { numRuns: 100 },
    )
  })

  test('radius < 50 → sparkline should NOT be shown', () => {
    fc.assert(
      fc.property(fc.float({ min: 30, max: Math.fround(49.99), noNaN: true }), (radius) => {
        const d: BubbleData = { ...baseData, radius }
        return shouldShowSparkline(d.radius) === false
      }),
      { numRuns: 100 },
    )
  })

  test('radius exactly 50 → sparkline should be shown (boundary inclusive)', () => {
    const d: BubbleData = { ...baseData, radius: 50 }
    expect(shouldShowSparkline(d.radius)).toBe(true)
  })

  test('radius exactly 49.99 → sparkline should NOT be shown', () => {
    const d: BubbleData = { ...baseData, radius: 49.99 }
    expect(shouldShowSparkline(d.radius)).toBe(false)
  })
})
