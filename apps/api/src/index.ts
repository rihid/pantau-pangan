import { Hono } from 'hono'
import { errorHandler } from './middleware/error-handler'
import komoditasRoutes from './routes/komoditas'
import insightRoutes from './routes/insight'
import provinsiRoutes from './routes/provinsi'

// Requirement 8.4: DATABASE_URL wajib tersedia saat startup
if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required but not set.')
  process.exit(1)
}

const app = new Hono()

// Global error handler
app.onError(errorHandler)

// Health check (Requirement 8.1)
app.get('/', (c) => c.json({ status: 'ok', service: 'pantau-pangan-api' }))

// Mount routes
app.route('/komoditas', komoditasRoutes)
app.route('/provinsi', provinsiRoutes)

// Insight di-mount terpisah karena path-nya nested di /komoditas/:id/insight
app.route('/komoditas', insightRoutes)

export default {
  port: Number(Bun.env.API_PORT) || 3001,
  fetch: app.fetch,
}
