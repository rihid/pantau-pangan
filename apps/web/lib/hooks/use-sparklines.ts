import { useQueries } from '@tanstack/react-query'
import { fetchHistorisKomoditas } from '@/lib/api-client'
import type { BubbleData } from '@pantau-pangan/shared'

/**
 * Fetch sparkline data untuk bubble yang radius-nya >= 50px.
 * Return map: komoditasId → prices number[]
 */
export function useSparklines(data: BubbleData[], provinsiId: number): Map<number, number[]> {
  const targets = data.filter((d) => d.radius >= 50)

  const results = useQueries({
    queries: targets.map((d) => ({
      queryKey: ['historis', d.komoditasId, provinsiId],
      queryFn: () => fetchHistorisKomoditas(d.komoditasId, provinsiId),
      staleTime: 60_000,
      retry: 1,
    })),
  })

  const map = new Map<number, number[]>()
  targets.forEach((d, i) => {
    const result = results[i]
    if (result?.data && result.data.length >= 2) {
      map.set(
        d.komoditasId,
        result.data.map((h) => h.harga),
      )
    }
  })
  return map
}
