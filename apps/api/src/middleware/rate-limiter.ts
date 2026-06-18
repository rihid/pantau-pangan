import type { MiddlewareHandler } from 'hono'
import { db } from '../db'
import { insightCache } from '../db/schema'
import { and, eq, isNull } from 'drizzle-orm'

// Module-level in-memory state — no Redis needed for V1
const inFlight = new Map<string, number>()

/** Get today's date in WIB (UTC+7) as YYYY-MM-DD string */
function getTodayWIB(): string {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().split('T')[0]!
}

/**
 * Extracts client IP from request headers.
 * Priority: X-Forwarded-For first segment → X-Real-IP → "unknown"
 * Always returns a non-empty trimmed string.
 */
export function extractIP(forwardedFor: string | undefined, realIP: string | undefined): string {
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first && first.length > 0) return first
  }
  if (realIP) {
    const trimmed = realIP.trim()
    if (trimmed.length > 0) return trimmed
  }
  return 'unknown'
}

/**
 * Rate limiter middleware for LLM insight endpoint.
 * Limits each IP to 1 concurrent in-flight LLM request.
 * Cache hits bypass the counter entirely.
 */
export const rateLimiter: MiddlewareHandler = async (c, next) => {
  // Parse route params needed for cache check
  const idParam = c.req.param('id')
  const provinsiIdParam = c.req.query('provinsiId') ?? '0'
  const komoditasId = parseInt(idParam ?? '0', 10)
  const provinsiId = parseInt(provinsiIdParam, 10)

  // Cache-aware check: if insight is already cached for today, skip rate limiting
  if (!isNaN(komoditasId) && komoditasId > 0) {
    try {
      const today = getTodayWIB()
      const cached = await db
        .select({ id: insightCache.id })
        .from(insightCache)
        .where(
          and(
            eq(insightCache.komoditasId, komoditasId),
            provinsiId === 0
              ? isNull(insightCache.provinsiId)
              : eq(insightCache.provinsiId, provinsiId),
            eq(insightCache.cacheDate, today),
          ),
        )
        .limit(1)

      if (cached.length > 0) {
        // Cache hit — serve directly without touching inFlight counter
        await next()
        return
      }
    } catch {
      // DB error during cache check: fall through to normal rate-limiting path
    }
  }

  const ip = extractIP(c.req.header('x-forwarded-for'), c.req.header('x-real-ip'))
  const current = inFlight.get(ip) ?? 0

  if (current >= 1) {
    return c.json({ error: 'Terlalu banyak request. Coba lagi sesaat.', status: 429 }, 429)
  }

  // Increment counter before forwarding to handler
  inFlight.set(ip, current + 1)

  try {
    await next()
  } finally {
    // Always decrement — even if handler throws or times out
    const after = inFlight.get(ip) ?? 0
    if (after <= 1) {
      inFlight.delete(ip)
    } else {
      inFlight.set(ip, after - 1)
    }
  }
}
