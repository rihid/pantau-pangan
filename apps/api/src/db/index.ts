import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { config } from 'dotenv'
import { resolve } from 'path'
import * as schema from './schema'

// Load .env from monorepo root (four levels up from apps/api/src/db/)
config({ path: resolve(__dirname, '../../../../.env') })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}

const client = postgres(connectionString)
export const db = drizzle(client, { schema })
export { schema }
