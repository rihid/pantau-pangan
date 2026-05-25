import { BI_BASE_URL, PRICE_TYPE_ID, IS_PASOKAN } from '@pantau-pangan/shared'

const MAX_RETRIES = 3

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return response
    } catch (error) {
      if (attempt === retries) throw error
      const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
      await Bun.sleep(delay)
    }
  }
  // Unreachable but satisfies TypeScript
  throw new Error('fetchWithRetry: exhausted retries')
}

export async function fetchCommoditiesTree(): Promise<unknown> {
  const url = `${BI_BASE_URL}/GetCommoditiesTree?_=${Date.now()}`
  const response = await fetchWithRetry(url)
  return response.json()
}

export async function fetchDetailGrid(comId: number, provId?: number): Promise<unknown> {
  // Courtesy delay between sequential calls
  await Bun.sleep(100 + Math.random() * 100)

  const today = new Date()
  const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`

  const params = new URLSearchParams({
    ProvId: String(provId ?? 0),
    PriceTypeId: String(PRICE_TYPE_ID),
    ComId: String(comId),
    date: dateStr,
    isPasokan: String(IS_PASOKAN),
    _: String(Date.now()),
  })

  const url = `${BI_BASE_URL}/GetDetailGridData2?${params.toString()}`
  const response = await fetchWithRetry(url)
  return response.json()
}
