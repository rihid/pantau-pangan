import { useQuery } from '@tanstack/react-query'
import { fetchDetailGeografis } from '@/lib/api-client'
import type { BiDetailGridRow } from '@pantau-pangan/shared'

export function useDetailGeografis(komoditasId: number | null, provinsiId: number) {
  return useQuery<{ data: BiDetailGridRow[] }>({
    queryKey: ['detail-geografis', komoditasId, provinsiId],
    queryFn: () => fetchDetailGeografis(komoditasId!, provinsiId),
    enabled: komoditasId !== null,
    staleTime: 30_000,
    retry: (failureCount, error) => {
      // Skip retry for HTTP 4xx errors
      if (error instanceof Error && /^API error: 4\d\d/.test(error.message)) return false
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30_000),
  })
}
