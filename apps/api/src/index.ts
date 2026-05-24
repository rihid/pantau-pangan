import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json({ status: 'ok', service: 'pantau-pangan-api' }))

export default {
  port: Number(Bun.env.API_PORT) || 3001,
  fetch: app.fetch,
}
