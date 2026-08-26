import type { BubbleData } from '@pantau-pangan/shared'
import { summarizeBubbles, STABLE_COLOR, TOP_MOVERS_LIMIT } from '@/lib/summary-utils'

function bubble(partial: Partial<BubbleData> & { komoditasId: number }): BubbleData {
  return {
    nama: `Komoditas ${partial.komoditasId}`,
    kategori: 'Test',
    harga: 10000,
    perubahan: 0,
    radius: 40,
    color: '#f97316',
    ...partial,
  }
}

describe('summarizeBubbles', () => {
  test('menghitung naik, turun, stabil, total', () => {
    const data: BubbleData[] = [
      bubble({ komoditasId: 1, perubahan: 5, color: '#ef4444' }),
      bubble({ komoditasId: 2, perubahan: 2, color: '#f97316' }),
      bubble({ komoditasId: 3, perubahan: -8, color: '#22c55e' }),
      bubble({ komoditasId: 4, perubahan: -1, color: '#84cc16' }),
      bubble({ komoditasId: 5, perubahan: 0.1, color: STABLE_COLOR }),
    ]
    const s = summarizeBubbles(data)
    expect(s.naik).toBe(2)
    expect(s.turun).toBe(2)
    expect(s.stabil).toBe(1)
    expect(s.total).toBe(5)
  })

  test('perubahan === 0 tanpa warna stabil tetap dihitung stabil', () => {
    const data: BubbleData[] = [bubble({ komoditasId: 1, perubahan: 0, color: '#f97316' })]
    const s = summarizeBubbles(data)
    expect(s.stabil).toBe(1)
    expect(s.naik).toBe(0)
    expect(s.turun).toBe(0)
  })

  test('topMovers urut menurun berdasarkan |perubahan|', () => {
    const data: BubbleData[] = [
      bubble({ komoditasId: 1, perubahan: 3 }),
      bubble({ komoditasId: 2, perubahan: -12 }),
      bubble({ komoditasId: 3, perubahan: 7 }),
    ]
    const s = summarizeBubbles(data)
    expect(s.topMovers.map((b) => b.komoditasId)).toEqual([2, 3, 1])
  })

  test('topMovers dibatasi TOP_MOVERS_LIMIT', () => {
    const data: BubbleData[] = Array.from({ length: 10 }, (_, i) =>
      bubble({ komoditasId: i + 1, perubahan: i + 1 }),
    )
    const s = summarizeBubbles(data)
    expect(s.topMovers).toHaveLength(TOP_MOVERS_LIMIT)
    expect(s.topMovers[0]?.komoditasId).toBe(10)
  })

  test('tidak memutasi input', () => {
    const data: BubbleData[] = [
      bubble({ komoditasId: 1, perubahan: 3 }),
      bubble({ komoditasId: 2, perubahan: -12 }),
    ]
    const original = data.map((b) => b.komoditasId)
    summarizeBubbles(data)
    expect(data.map((b) => b.komoditasId)).toEqual(original)
  })

  test('dataset kosong', () => {
    const s = summarizeBubbles([])
    expect(s).toEqual({ naik: 0, turun: 0, stabil: 0, total: 0, topMovers: [] })
  })
})
