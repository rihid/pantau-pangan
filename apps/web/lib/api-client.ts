import type {
  BiDetailGridRow,
  BubbleData,
  DataRangeResponse,
  HargaHarian,
  InsightResponse,
  Provinsi,
  Timeframe,
} from '@pantau-pangan/shared'

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

export function fetchDataRange(provinsiId: number): Promise<DataRangeResponse> {
  return apiFetch<DataRangeResponse>(`/komoditas/data-range?provinsiId=${provinsiId}`)
}

// M5 Modal Detail fetch functions

export function fetchHistorisModal(
  komoditasId: number,
  provinsiId: number,
): Promise<HargaHarian[]> {
  return apiFetch<HargaHarian[]>(`/komoditas/${komoditasId}/historis?provinsiId=${provinsiId}`)
}

export function fetchDetailGeografis(
  komoditasId: number,
  provinsiId: number,
): Promise<{ data: BiDetailGridRow[] }> {
  return apiFetch<{ data: BiDetailGridRow[] }>(
    `/komoditas/${komoditasId}/detail?provinsiId=${provinsiId}`,
  )
}

export function fetchInsight(komoditasId: number, provinsiId: number): Promise<InsightResponse> {
  return apiFetch<InsightResponse>(`/komoditas/${komoditasId}/insight?provinsiId=${provinsiId}`)
}
