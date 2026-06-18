import { Hono } from 'hono'
import { getInsight } from '../services/insight.service'
import { parseIntParam, validateProvinsiId } from '../lib/validators'
import { rateLimiter } from '../middleware/rate-limiter'

const app = new Hono()

// GET /komoditas/:id/insight
app.get('/:id/insight', rateLimiter, async (c) => {
  const id = parseIntParam(c.req.param('id'), 'id')
  const provinsiId = validateProvinsiId(c.req.query('provinsiId') ?? '0')
  const data = await getInsight(id, provinsiId)
  return c.json(data)
})

export default app
