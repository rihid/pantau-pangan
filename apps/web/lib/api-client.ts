import type { BubbleData, HargaHarian, Provinsi, Timeframe } from '@pantau-pangan/shared'

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export function fetchKomoditas(timeframe: Timeframe, provinsiId: number): Promise<BubbleData[]> {
  return apiFetch<BubbleData[]>(`/komoditas?timeframe=${timeframe}&provinsiId=${provinsiId}`)
}

export function fetchProvinsi(): Promise<Provinsi[]> {
  return apiFetch<Provinsi[]>('/provinsi')
}

export function fetchHistorisKomoditas(
  komoditasId: number,
  provinsiId: number,
): Promise<HargaHarian[]> {
  return apiFetch<HargaHarian[]>(`/komoditas/${komoditasId}/historis?provinsiId=${provinsiId}`)
}
