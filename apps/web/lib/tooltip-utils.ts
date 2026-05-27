export const TOOLTIP_WIDTH = 200
export const TOOLTIP_HEIGHT = 120

/**
 * Calculates the tooltip position relative to a bubble, keeping it within
 * the viewport bounds.
 *
 * Logic:
 * 1. Default: offset to the bottom-right of the bubble (x + 12, y + 12)
 * 2. If overflows right edge: flip to left side of bubble
 * 3. If overflows bottom edge: flip to top side of bubble
 * 4. Final clamp: ensure tooltip stays fully within viewport
 */
export function calculateTooltipPosition(
  bubbleX: number,
  bubbleY: number,
  viewportWidth: number,
  viewportHeight: number,
  tooltipWidth: number,
  tooltipHeight: number,
): { x: number; y: number } {
  // Step 1: default position — offset bottom-right from bubble
  let x = bubbleX + 12
  let y = bubbleY + 12

  // Step 2: flip to left side if overflows right edge
  if (x + tooltipWidth > viewportWidth) {
    x = bubbleX - tooltipWidth - 12
  }

  // Step 3: flip to top side if overflows bottom edge
  if (y + tooltipHeight > viewportHeight) {
    y = bubbleY - tooltipHeight - 12
  }

  // Step 4: final clamp to keep tooltip fully within viewport
  x = Math.max(0, Math.min(viewportWidth - tooltipWidth, x))
  y = Math.max(0, Math.min(viewportHeight - tooltipHeight, y))

  return { x, y }
}
