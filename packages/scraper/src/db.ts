import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { config } from 'dotenv'
import { resolve } from 'path'
import * as schema from '../../../apps/api/src/db/schema'

// Load .env from monorepo root (three levels up from packages/scraper/src/)
config({ path: resolve(__dirname, '../../../.env') })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required for scraper')
}

const client = postgres(connectionString)
export const db = drizzle(client, { schema })

export async function closeConnection(): Promise<void> {
  await client.end()
}

export { schema }
