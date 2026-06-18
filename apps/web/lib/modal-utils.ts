import { TIMEFRAME_DAYS, VOLATILITY_THRESHOLDS } from '@pantau-pangan/shared'
import type { BiDetailGridRow, HargaHarian, Timeframe } from '@pantau-pangan/shared'

/**
 * Filter HargaHarian[] to only include entries within the last
 * TIMEFRAME_DAYS[timeframe] days from the most recent date in data.
 * If data is shorter than the full duration, returns all data (graceful degradation).
 * Empty input → returns [].
 */
export function filterByTimeframe(data: HargaHarian[], timeframe: Timeframe): HargaHarian[] {
  if (data.length === 0) return []

  const days = TIMEFRAME_DAYS[timeframe]

  // Find the latest date in the dataset
  const sortedDates = data
    .map((d) => new Date(d.tanggal).getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => b - a)

  if (sortedDates.length === 0) return data

  const latestTs = sortedDates[0]
  if (latestTs === undefined) return data
  // Cutoff: latestTs - days (in ms)
  const cutoffTs = latestTs - days * 24 * 60 * 60 * 1000

  const filtered = data.filter((d) => {
    const ts = new Date(d.tanggal).getTime()
    return !isNaN(ts) && ts >= cutoffTs
  })

  // Graceful degradation: if filtered is empty (shouldn't happen), return all
  return filtered.length > 0 ? filtered : data
}

/**
 * Parse date column keys from a BiDetailGridRow.
 * Returns only keys matching /^\d{2}\/\d{2}\/\d{4}$/ sorted ascending (oldest first).
 */
export function parseDateColumns(row: BiDetailGridRow): string[] {
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/

  const dateKeys = Object.keys(row).filter((key) => dateRegex.test(key))

  // Sort ascending by parsing DD/MM/YYYY into a comparable Date
  dateKeys.sort((a, b) => {
    const parseDate = (s: string): number => {
      const [day, month, year] = s.split('/')
      return new Date(`${year}-${month}-${day}`).getTime()
    }
    return parseDate(a) - parseDate(b)
  })

  return dateKeys
}

/**
 * Format a price value as integer with thousands separator (id-ID locale), no "Rp" prefix.
 * null / 0 / undefined → "—"
 */
export function formatHarga(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return '—'
  return Math.round(value).toLocaleString('id-ID')
}

/**
 * Format a price value as "Rp X.XXX/kg" with no decimals.
 * null / 0 → "Rp —"
 */
export function formatHargaRp(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return 'Rp —'
  return `Rp ${Math.round(value).toLocaleString('id-ID')}/kg`
}

/**
 * Format % change with arrow + color based on VOLATILITY_THRESHOLDS[timeframe].
 * Stable: |perubahan| < stable or perubahan === 0 → arrow '', color abu
 */
export function formatPerubahan(
  perubahan: number,
  timeframe: Timeframe,
): { text: string; color: string; arrow: '↑' | '↓' | '' } {
  const { stable, significant } = VOLATILITY_THRESHOLDS[timeframe]
  const abs = Math.abs(perubahan)

  // Stable: exactly 0 or below stable/5 threshold (matching bubble color logic)
  const isStable = perubahan === 0 || abs < stable / 5

  if (isStable) {
    return {
      text: `${abs.toFixed(1)}%`,
      color: '#6b7280',
      arrow: '',
    }
  }

  const arrow: '↑' | '↓' = perubahan > 0 ? '↑' : '↓'

  let color: string
  if (perubahan > 0) {
    color = abs >= significant ? '#ef4444' : '#f97316'
  } else {
    color = abs >= significant ? '#22c55e' : '#84cc16'
  }

  return {
    text: `${arrow}${abs.toFixed(1)}%`,
    color,
    arrow,
  }
}

/**
 * Compute the highest and lowest price points from HargaHarian[].
 * Returns null if length <= 1.
 */
export function computeHighLow(data: HargaHarian[]): { max: HargaHarian; min: HargaHarian } | null {
  if (data.length <= 1) return null

  let maxItem = data[0]!
  let minItem = data[0]!

  for (const item of data) {
    if (item.harga > maxItem.harga) maxItem = item
    if (item.harga < minItem.harga) minItem = item
  }

  return { max: maxItem, min: minItem }
}

/**
 * Format 'YYYY-MM-DD' to 'DD/MM/YYYY'
 */
export function formatTanggal(tanggal: string): string {
  const [year, month, day] = tanggal.split('-')
  if (!year || !month || !day) return tanggal
  return `${day}/${month}/${year}`
}

/**
 * Sort BiDetailGridRow[] by numeric value in the given dateKey column.
 * Does not mutate the original array.
 */
export function sortByDateColumn(
  rows: BiDetailGridRow[],
  dateKey: string,
  direction: 'asc' | 'desc',
): BiDetailGridRow[] {
  return [...rows].sort((a, b) => {
    const aRaw = a[dateKey]
    const bRaw = b[dateKey]
    const aVal = typeof aRaw === 'number' ? aRaw : 0
    const bVal = typeof bRaw === 'number' ? bRaw : 0
    return direction === 'asc' ? aVal - bVal : bVal - aVal
  })
}
