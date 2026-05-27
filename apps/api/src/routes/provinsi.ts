import { Hono } from 'hono'
import { getProvinsiList } from '../services/komoditas.service'

const app = new Hono()

// GET /provinsi
app.get('/', async (c) => {
  const data = await getProvinsiList()
  return c.json(data)
})

export default app
