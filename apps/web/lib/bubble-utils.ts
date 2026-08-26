import type { BubbleData } from '@pantau-pangan/shared'

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

/**
 * Hitung scale factor radius bubble supaya total luas semua bubble mengisi
 * ±targetFillRatio dari luas canvas. Semua bubble di-scale dengan faktor yang
 * sama, sehingga rasio ukuran relatif antar bubble (yang mencerminkan data)
 * tetap terjaga.
 *
 * Di-cap supaya bubble terbesar tidak melebihi ~maxSizeRatio dari dimensi
 * terkecil canvas, sehingga satu bubble tidak bisa memenuhi layar.
 */
export function computeBubbleScale(
  data: BubbleData[],
  width: number,
  height: number,
  targetFillRatio = 0.7,
  maxSizeRatio = 0.4,
): number {
  if (width <= 0 || height <= 0 || data.length === 0) return 1

  const maxRadius = Math.max(...data.map((d) => d.radius))
  if (maxRadius <= 0) return 1

  const canvasArea = width * height
  const totalUnscaledArea = data.reduce((sum, d) => sum + Math.PI * d.radius * d.radius, 0)
  if (totalUnscaledArea <= 0) return 1

  const areaScale = Math.sqrt((targetFillRatio * canvasArea) / totalUnscaledArea)

  const minDim = Math.min(width, height)
  const capScale = (minDim * maxSizeRatio) / maxRadius

  return Math.min(areaScale, capScale)
}
