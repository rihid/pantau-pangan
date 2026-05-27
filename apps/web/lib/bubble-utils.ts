/**
 * Clamps a bubble's position so it stays fully within the SVG canvas bounds.
 *
 * @param x - Raw x position from D3 force simulation
 * @param y - Raw y position from D3 force simulation
 * @param radius - Bubble radius in pixels
 * @param width - SVG canvas width in pixels
 * @param height - SVG canvas height in pixels
 * @returns Clamped { x, y } position where the bubble is fully within bounds
 */
export function clampBubblePosition(
  x: number,
  y: number,
  radius: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: Math.max(radius, Math.min(width - radius, x)),
    y: Math.max(radius, Math.min(height - radius, y)),
  }
}
