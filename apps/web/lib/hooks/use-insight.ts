import { useQuery } from '@tanstack/react-query'
import { fetchInsight } from '@/lib/api-client'
import type { InsightResponse } from '@pantau-pangan/shared'

export function useInsight(komoditasId: number | null, provinsiId: number) {
  return useQuery<InsightResponse>({
    queryKey: ['insight', komoditasId, provinsiId],
    queryFn: () => fetchInsight(komoditasId!, provinsiId),
    enabled: komoditasId !== null,
    staleTime: 5 * 60_000,
    retry: (failureCount, error) => {
      // Skip retry for HTTP 4xx errors
      if (error instanceof Error && /^API error: 4\d\d/.test(error.message)) return false
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30_000),
  })
}
