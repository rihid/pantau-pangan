import { Hono } from 'hono'
import { getAllKomoditas, getDetail } from '../services/komoditas.service'
import { getHistoris } from '../services/harga.service'
import { parseIntParam, validateTimeframe, validateProvinsiId } from '../lib/validators'

const app = new Hono()

// GET /komoditas
app.get('/', async (c) => {
  const timeframe = validateTimeframe(c.req.query('timeframe') ?? '1D')
  const provinsiId = validateProvinsiId(c.req.query('provinsiId') ?? '0')
  const data = await getAllKomoditas(provinsiId, timeframe)
  return c.json(data)
})

// GET /komoditas/:id/historis
app.get('/:id/historis', async (c) => {
  const id = parseIntParam(c.req.param('id'), 'id')
  const provinsiId = validateProvinsiId(c.req.query('provinsiId') ?? '0')
  const data = await getHistoris(id, provinsiId)
  return c.json(data)
})

// GET /komoditas/:id/detail
app.get('/:id/detail', async (c) => {
  const id = parseIntParam(c.req.param('id'), 'id')
  const provinsiId = validateProvinsiId(c.req.query('provinsiId') ?? '0')
  const data = await getDetail(id, provinsiId)
  return c.json(data)
})

export default app
