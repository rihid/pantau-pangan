// Feature: m4-bubble-chart, Property 5: Tooltip Viewport Containment

import fc from 'fast-check'
import { calculateTooltipPosition, TOOLTIP_WIDTH, TOOLTIP_HEIGHT } from '@/lib/tooltip-utils'

/**
 * Property 5: Tooltip Viewport Containment
 * Validates: Requirements 5.5
 *
 * For any combination of (bubbleX, bubbleY, viewportWidth, viewportHeight),
 * calculateTooltipPosition must return a position where the tooltip stays
 * fully within the viewport bounds.
 */
describe('calculateTooltipPosition', () => {
  test('Property 5: tooltip always stays within viewport bounds', () => {
    fc.assert(
      fc.property(
        fc.record({
          bubbleX: fc.float({ min: 0, max: 2000, noNaN: true }),
          bubbleY: fc.float({ min: 0, max: 1200, noNaN: true }),
          viewportWidth: fc.float({ min: 300, max: 3000, noNaN: true }),
          viewportHeight: fc.float({ min: 300, max: 2000, noNaN: true }),
        }),
        ({ bubbleX, bubbleY, viewportWidth, viewportHeight }) => {
          const { x, y } = calculateTooltipPosition(
            bubbleX,
            bubbleY,
            viewportWidth,
            viewportHeight,
            TOOLTIP_WIDTH,
            TOOLTIP_HEIGHT,
          )

          return (
            x >= 0 &&
            x + TOOLTIP_WIDTH <= viewportWidth &&
            y >= 0 &&
            y + TOOLTIP_HEIGHT <= viewportHeight
          )
        },
      ),
      { numRuns: 100 },
    )
  })
})
