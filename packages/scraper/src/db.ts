import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../../apps/api/src/db/schema'

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
