import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env from monorepo root (two levels up from apps/api/)
config({ path: resolve(__dirname, '../../.env') })

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
