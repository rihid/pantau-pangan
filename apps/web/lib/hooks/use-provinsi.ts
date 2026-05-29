import { useQuery } from '@tanstack/react-query'
import { fetchProvinsi } from '@/lib/api-client'
import type { Provinsi } from '@pantau-pangan/shared'

export function useProvinsi() {
  const { data, isLoading, isError } = useQuery<Provinsi[]>({
    queryKey: ['provinsi'],
    queryFn: fetchProvinsi,
    staleTime: 5 * 60_000,
    retry: 2,
  })

  return { data, isLoading, isError }
}
