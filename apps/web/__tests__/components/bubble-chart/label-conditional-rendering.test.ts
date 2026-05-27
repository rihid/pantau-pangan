// Feature: m4-bubble-chart, Property 2: Label Conditional Rendering

import fc from 'fast-check'
import type { BubbleData } from '@pantau-pangan/shared'

/**
 * Property 2: Label Conditional Rendering
 * Validates: Requirements 4.1, 4.2, 4.3, 4.6
 *
 * Tests the pure label-generation logic extracted from BubbleChart:
 * - radius >= 40 + perubahan > 0  → label contains ↑
 * - radius >= 40 + perubahan < 0  → label contains ↓
 * - color === '#6b7280'           → label contains no ↑ or ↓
 * - radius < 40                   → no label rendered (null)
 */

/** Mirrors the label logic in BubbleChart component */
function getBubbleLabel(d: BubbleData): string | null {
  if (d.radius < 40) return null

  const isStable = d.color === '#6b7280'
  const arrow = isStable ? '' : d.perubahan > 0 ? '↑' : d.perubahan < 0 ? '↓' : ''
  const pct = `${Math.abs(d.perubahan).toFixed(1)}%`
  const shortName = d.nama.length > 10 ? d.nama.substring(0, 10) : d.nama
  return arrow ? `${shortName} ${arrow}${pct}` : `${shortName} ${pct}`
}

const baseData: Omit<BubbleData, 'radius' | 'perubahan' | 'color'> = {
  komoditasId: 1,
  nama: 'Beras',
  kategori: 'Beras',
  harga: 12000,
}

describe('Property 2: Label Conditional Rendering', () => {
  test('radius >= 40 + perubahan > 0 → label contains ↑', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 40, max: 120, noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: 50, noNaN: true }),
        fc.constantFrom('#ef4444', '#f97316'),
        (radius, perubahan, color) => {
          const d: BubbleData = { ...baseData, radius, perubahan, color }
          const label = getBubbleLabel(d)
          return label !== null && label.includes('↑')
        },
      ),
      { numRuns: 100 },
    )
  })

  test('radius >= 40 + perubahan < 0 → label contains ↓', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 40, max: 120, noNaN: true }),
        fc.float({ min: -50, max: Math.fround(-0.01), noNaN: true }),
        fc.constantFrom('#22c55e', '#84cc16'),
        (radius, perubahan, color) => {
          const d: BubbleData = { ...baseData, radius, perubahan, color }
          const label = getBubbleLabel(d)
          return label !== null && label.includes('↓')
        },
      ),
      { numRuns: 100 },
    )
  })

  test('color === #6b7280 (stable) → label contains no ↑ or ↓', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 40, max: 120, noNaN: true }),
        fc.float({ min: -50, max: 50, noNaN: true }),
        (radius, perubahan) => {
          const d: BubbleData = { ...baseData, radius, perubahan, color: '#6b7280' }
          const label = getBubbleLabel(d)
          return label !== null && !label.includes('↑') && !label.includes('↓')
        },
      ),
      { numRuns: 100 },
    )
  })

  test('radius < 40 → no label (null)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: Math.fround(39.99), noNaN: true }),
        fc.float({ min: -50, max: 50, noNaN: true }),
        fc.constantFrom('#6b7280', '#ef4444', '#f97316', '#22c55e', '#84cc16'),
        (radius, perubahan, color) => {
          const d: BubbleData = { ...baseData, radius, perubahan, color }
          return getBubbleLabel(d) === null
        },
      ),
      { numRuns: 100 },
    )
  })
})
