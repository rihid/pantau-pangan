import { useQuery } from '@tanstack/react-query'
import { fetchKomoditas } from '@/lib/api-client'
import type { Timeframe } from '@pantau-pangan/shared'

export function useKomoditas(timeframe: Timeframe, provinsiId: number) {
  const { data, isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: ['komoditas', timeframe, provinsiId],
    queryFn: () => fetchKomoditas(timeframe, provinsiId),
    staleTime: 30_000,
    retry: 2,
  })

  return { data, isLoading, isError, isRefetching, refetch }
}
