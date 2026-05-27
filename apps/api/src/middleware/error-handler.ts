import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ApiError } from '../lib/validators'

export function errorHandler(err: Error, c: Context) {
  if (err instanceof ApiError) {
    const status = err.status as ContentfulStatusCode
    return c.json({ error: err.message, status: err.status }, status)
  }
  // Error internal — jangan expose detail
  console.error('Internal error:', err)
  return c.json({ error: 'Terjadi kesalahan internal server', status: 500 }, 500)
}
