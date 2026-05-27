import type { Timeframe } from '@pantau-pangan/shared'

export const VALID_TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Parse integer dari path/query param, throw ApiError(400) jika invalid */
export function parseIntParam(value: string, paramName: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(400, `Parameter '${paramName}' harus berupa integer positif`)
  }
  return parsed
}

/** Validate timeframe, throw ApiError(400) jika invalid */
export function validateTimeframe(value: string): Timeframe {
  if (!VALID_TIMEFRAMES.includes(value as Timeframe)) {
    throw new ApiError(
      400,
      `Parameter 'timeframe' tidak valid: '${value}'. Nilai yang diterima: ${VALID_TIMEFRAMES.join(', ')}`,
    )
  }
  return value as Timeframe
}

/** Validate provinsiId (integer >= 0), throw ApiError(400) jika invalid */
export function validateProvinsiId(value: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ApiError(400, `Parameter 'provinsiId' harus berupa integer non-negatif`)
  }
  return parsed
}
