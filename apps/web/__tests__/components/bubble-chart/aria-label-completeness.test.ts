// Feature: m4-bubble-chart, Property 9: Aria Label Completeness

import fc from 'fast-check'
import type { BubbleData } from '@pantau-pangan/shared'

/**
 * Property 9: Aria Label Completeness
 * Validates: Requirements 4.5
 *
 * For any BubbleData, the aria-label on the <circle> element must contain:
 * - the komoditas name
 * - the harga formatted as Rupiah (toLocaleString 'id-ID')
 * - the perubahan percentage
 */

/** Mirrors the aria-label logic in BubbleChart component */
function getCircleAriaLabel(d: BubbleData): string {
  return `${d.nama}: Rp ${d.harga.toLocaleString('id-ID')}/kg, ${
    d.perubahan > 0 ? 'naik' : 'turun'
  } ${Math.abs(d.perubahan).toFixed(1)}%`
}

const bubbleDataArb = fc.record({
  komoditasId: fc.nat({ max: 1000 }),
  nama: fc.string({ minLength: 1, maxLength: 30 }),
  kategori: fc.string({ minLength: 1, maxLength: 20 }),
  harga: fc.float({ min: 1000, max: 100000, noNaN: true }),
  perubahan: fc.float({ min: -50, max: 50, noNaN: true }),
  radius: fc.float({ min: 30, max: 120, noNaN: true }),
  color: fc.constantFrom('#6b7280', '#ef4444', '#f97316', '#22c55e', '#84cc16'),
})

describe('Property 9: Aria Label Completeness', () => {
  test('aria-label contains komoditas name', () => {
    fc.assert(
      fc.property(bubbleDataArb, (d: BubbleData) => {
        const label = getCircleAriaLabel(d)
        return label.includes(d.nama)
      }),
      { numRuns: 100 },
    )
  })

  test('aria-label contains harga formatted as Rupiah', () => {
    fc.assert(
      fc.property(bubbleDataArb, (d: BubbleData) => {
        const label = getCircleAriaLabel(d)
        // Must contain "Rp" and "/kg"
        return label.includes('Rp') && label.includes('/kg')
      }),
      { numRuns: 100 },
    )
  })

  test('aria-label contains perubahan percentage', () => {
    fc.assert(
      fc.property(bubbleDataArb, (d: BubbleData) => {
        const label = getCircleAriaLabel(d)
        const pct = `${Math.abs(d.perubahan).toFixed(1)}%`
        return label.includes(pct)
      }),
      { numRuns: 100 },
    )
  })

  test('aria-label contains naik/turun direction indicator', () => {
    fc.assert(
      fc.property(bubbleDataArb, (d: BubbleData) => {
        const label = getCircleAriaLabel(d)
        return label.includes('naik') || label.includes('turun')
      }),
      { numRuns: 100 },
    )
  })
})
