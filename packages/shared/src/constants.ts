import type { Timeframe } from './types'

export const BI_BASE_URL = 'https://www.bi.go.id/hargapangan/WebSite/Home'
export const PRICE_TYPE_ID = 1
export const IS_PASOKAN = 1

export const VOLATILITY_THRESHOLDS: Record<Timeframe, { stable: number; significant: number }> = {
  '1D': { stable: 0.5, significant: 2 },
  '1W': { stable: 2, significant: 5 },
  '1M': { stable: 5, significant: 10 },
  '3M': { stable: 10, significant: 20 },
  '1Y': { stable: 15, significant: 30 },
}

export const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
}
export const BUBBLE_MIN_RADIUS = 40
export const BUBBLE_MAX_RADIUS = 120
