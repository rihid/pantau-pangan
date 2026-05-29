// Feature: m4-bubble-chart, Property 3: Bubble position clamping invariant

import fc from 'fast-check'
import { clampBubblePosition } from '@/lib/bubble-utils'

/**
 * Property 3: Bubble Position Clamping Invariant
 * Validates: Requirements 3.7
 *
 * For any combination of (width, height, radius, rawX, rawY) where
 * width > 2*radius and height > 2*radius (valid canvas), the clamped
 * position must satisfy:
 *   x ∈ [radius, width - radius]
 *   y ∈ [radius, height - radius]
 */
describe('clampBubblePosition — Property 3: Bubble Position Clamping Invariant', () => {
  test('clamped x and y are always within [radius, dimension - radius]', () => {
    fc.assert(
      fc.property(
        // width and height: must be > 2*radius for a valid clamp range.
        // radius max is 120, so width/height min of 100 could produce
        // width - radius < radius when radius > 50. We use fc.filter to
        // skip combinations where the canvas is too small for the bubble.
        fc.float({ min: 100, max: 2000, noNaN: true }), // width
        fc.float({ min: 100, max: 2000, noNaN: true }), // height
        fc.float({ min: 30, max: 120, noNaN: true }), // radius
        fc.float({ min: -1000, max: 3000, noNaN: true }), // rawX
        fc.float({ min: -1000, max: 3000, noNaN: true }), // rawY
        (width, height, radius, rawX, rawY) => {
          // Precondition: canvas must be large enough to contain the bubble.
          // If width <= 2*radius or height <= 2*radius, the clamp range
          // [radius, dimension - radius] is empty or inverted — skip.
          fc.pre(width > 2 * radius)
          fc.pre(height > 2 * radius)

          const { x, y } = clampBubblePosition(rawX, rawY, radius, width, height)

          return x >= radius && x <= width - radius && y >= radius && y <= height - radius
        },
      ),
      { numRuns: 100 },
    )
  })
})
