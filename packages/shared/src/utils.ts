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

/**
 * Hitung radius bubble berdasarkan persentase perubahan.
 *
 * Ukuran di-scale relatif terhadap nilai absolut terbesar dalam dataset
 * (maxAbsPersen), bukan threshold fixed — supaya perbedaan antar bubble
 * tetap terlihat jelas di semua timeframe.
 *
 * Fallback ke threshold `significant` jika maxAbsPersen tidak diberikan
 * (backward-compat).
 */
export function getBubbleRadius(
  persen: number,
  timeframe: Timeframe,
  maxAbsPersen?: number,
): number {
  const { significant } = VOLATILITY_THRESHOLDS[timeframe]
  // Gunakan max aktual dataset sebagai ceiling, minimal = significant threshold
  const ceiling = Math.max(maxAbsPersen ?? significant, significant)
  const ratio = Math.min(Math.abs(persen) / ceiling, 1)
  return BUBBLE_MIN_RADIUS + ratio * (BUBBLE_MAX_RADIUS - BUBBLE_MIN_RADIUS)
}

export function parseDateKeys(row: Record<string, unknown>): string[] {
  return Object.keys(row)
    .filter((k) => /^\d{2}\/\d{2}\/\d{4}$/.test(k))
    .sort()
}

/**
 * Buat SVG polyline points string dari array harga.
 * Output: string "x1,y1 x2,y2 ..." yang siap dipakai di SVG <polyline points=...>
 */
export function buildSparklinePoints(
  prices: number[],
  width: number,
  height: number,
  padding = 4,
): string {
  if (prices.length < 2) return ''
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  return prices
    .map((p, i) => {
      const px = padding + (i / (prices.length - 1)) * (width - padding * 2)
      const py = padding + (1 - (p - min) / range) * (height - padding * 2)
      return `${px.toFixed(1)},${py.toFixed(1)}`
    })
    .join(' ')
}
