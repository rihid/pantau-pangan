import { useQuery } from '@tanstack/react-query'
import { fetchHistorisModal } from '@/lib/api-client'
import type { HargaHarian, Timeframe } from '@pantau-pangan/shared'

export function useHistorisModal(
  komoditasId: number | null,
  timeframe: Timeframe,
  provinsiId: number,
) {
  return useQuery<HargaHarian[]>({
    queryKey: ['historis-modal', komoditasId, timeframe, provinsiId],
    queryFn: () => fetchHistorisModal(komoditasId!, provinsiId),
    enabled: komoditasId !== null,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      // Skip retry for HTTP 4xx errors
      if (error instanceof Error && /^API error: 4\d\d/.test(error.message)) return false
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30_000),
  })
}
