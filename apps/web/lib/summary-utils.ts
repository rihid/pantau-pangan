import type { BubbleData } from '@pantau-pangan/shared'

/** Hex sentinel untuk bubble stabil (lihat getBubbleColor di @pantau-pangan/shared). */
export const STABLE_COLOR = '#6b7280'

/** Jumlah maksimum komoditas yang ditampilkan di daftar "Top pergerakan". */
export const TOP_MOVERS_LIMIT = 6

export interface BubbleSummary {
  /** Komoditas yang harganya naik (perubahan > 0 dan tidak stabil). */
  naik: number
  /** Komoditas yang harganya turun (perubahan < 0 dan tidak stabil). */
  turun: number
  /** Komoditas yang harganya stabil (color === STABLE_COLOR). */
  stabil: number
  /** Total komoditas. */
  total: number
  /** Komoditas dengan |perubahan| terbesar, urut menurun, maks TOP_MOVERS_LIMIT. */
  topMovers: BubbleData[]
}

/**
 * Ringkas dataset bubble menjadi agregat naik/turun/stabil + daftar top movers.
 *
 * Stabil ditentukan oleh `color` (sentinel STABLE_COLOR), konsisten dengan
 * logika warna di getBubbleColor — bukan oleh threshold yang dihitung ulang di FE.
 * Pure function: tidak memutasi input.
 */
export function summarizeBubbles(data: BubbleData[]): BubbleSummary {
  let naik = 0
  let turun = 0
  let stabil = 0

  for (const b of data) {
    if (b.color === STABLE_COLOR) {
      stabil++
    } else if (b.perubahan > 0) {
      naik++
    } else if (b.perubahan < 0) {
      turun++
    } else {
      stabil++
    }
  }

  const topMovers = [...data]
    .sort((a, b) => Math.abs(b.perubahan) - Math.abs(a.perubahan))
    .slice(0, TOP_MOVERS_LIMIT)

  return { naik, turun, stabil, total: data.length, topMovers }
}
