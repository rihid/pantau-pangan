import type { Timeframe } from './types'
import { VOLATILITY_THRESHOLDS, BUBBLE_MIN_RADIUS, BUBBLE_MAX_RADIUS } from './constants'

export function hitungPerubahan(hargaSekarang: number, hargaTarget: number): number {
  return ((hargaSekarang - hargaTarget) / hargaTarget) * 100
}

export function getBubbleColor(persen: number, timeframe: Timeframe): string {
  const { stable, significant } = VOLATILITY_THRESHOLDS[timeframe]
  if (Math.abs(persen) < stable / 5) return '#6b7280'
  if (persen >= significant) return '#ef4444'
  if (persen > 0) return '#f97316'
  if (persen <= -significant) return '#22c55e'
  return '#84cc16'
}

export function getBubbleRadius(persen: number, timeframe: Timeframe): number {
  const { significant } = VOLATILITY_THRESHOLDS[timeframe]
  const ratio = Math.min(Math.abs(persen) / significant, 1)
  return BUBBLE_MIN_RADIUS + ratio * (BUBBLE_MAX_RADIUS - BUBBLE_MIN_RADIUS)
}

export function parseDateKeys(row: Record<string, unknown>): string[] {
  return Object.keys(row)
    .filter((k) => /^\d{2}\/\d{2}\/\d{4}$/.test(k))
    .sort()
}
