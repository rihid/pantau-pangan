import { useQuery } from '@tanstack/react-query'
import { fetchDataRange } from '@/lib/api-client'
import { TIMEFRAME_DAYS } from '@pantau-pangan/shared'
import type { Timeframe } from '@pantau-pangan/shared'

/**
 * Fetch rentang data yang tersedia di DB.
 * Return `disabledTimeframes` — set timeframe yang datanya tidak cukup.
 */
export function useDataRange(provinsiId: number) {
  const { data } = useQuery({
    queryKey: ['data-range', provinsiId],
    queryFn: () => fetchDataRange(provinsiId),
    staleTime: 5 * 60_000, // 5 menit — tidak perlu sering refresh
    retry: 1,
  })

  const availableDays = data?.availableDays ?? 0

  // Timeframe disabled jika data yang tersedia < hari yang dibutuhkan
  const disabledTimeframes = new Set<Timeframe>(
    (Object.entries(TIMEFRAME_DAYS) as [Timeframe, number][])
      .filter(([, days]) => availableDays < days)
      .map(([tf]) => tf),
  )

  return { dataRange: data, availableDays, disabledTimeframes }
}
