import { useQuery } from '@tanstack/react-query'
import { fetchHistorisKomoditas } from '@/lib/api-client'
import type { HargaHarian } from '@pantau-pangan/shared'

export function useHistorisKomoditas(komoditasId: number | null, provinsiId: number) {
  return useQuery<HargaHarian[]>({
    queryKey: ['historis', komoditasId, provinsiId],
    queryFn: () => fetchHistorisKomoditas(komoditasId!, provinsiId),
    enabled: komoditasId !== null,
    staleTime: 60_000,
    retry: 2,
  })
}
