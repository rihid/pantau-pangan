// Feature: m4-bubble-chart, Property 3: Bubble position clamping invariant

import fc from 'fast-check'
import { clampBubblePosition } from '@/lib/bubble-utils'

/**
 * Property 3: Bubble Position Clamping Invariant
 * Validates: Requirements 3.7
 *
 * For any combination of (width, height, radius) where width > 0, height > 0,
 * and radius in range [30, 120], the clamp function must produce
 * x ∈ [radius, width - radius] and y ∈ [radius, height - radius].
 *
 * Note: width and height must be > 2 * radius for the clamped range to be
 * non-empty. Since max radius is 120, we use min: 241 for dimensions to
 * guarantee width - radius > radius for all generated inputs.
 */
describe('clampBubblePosition', () => {
  test('Property 3: clamped x and y are always within [radius, dimension - radius]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 241, max: 2000, noNaN: true }), // width  (> 2 * max_radius)
        fc.float({ min: 241, max: 2000, noNaN: true }), // height (> 2 * max_radius)
        fc.float({ min: 30, max: 120, noNaN: true }), // radius
        fc.float({ min: -1000, max: 3000, noNaN: true }), // rawX
        fc.float({ min: -1000, max: 3000, noNaN: true }), // rawY
        (width, height, radius, rawX, rawY) => {
          const { x, y } = clampBubblePosition(rawX, rawY, radius, width, height)
          return x >= radius && x <= width - radius && y >= radius && y <= height - radius
        },
      ),
      { numRuns: 100 },
    )
  })
})
