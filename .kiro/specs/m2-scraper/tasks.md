# Implementation Plan: M2 Scraper

## Overview

Implementasi pipeline data dari BI PIHPS API ke PostgreSQL. Menggunakan Drizzle ORM untuk schema dan query, Bun native fetch untuk HTTP, dan pure functions untuk parsing. Bahasa implementasi: TypeScript (sesuai project convention).

## Tasks

- [x] 1. Install dependencies dan configure Drizzle
  - [x] 1.1 Install runtime dependencies di apps/api
    - `bun add drizzle-orm postgres --filter=@pantau-pangan/api`
    - _Requirements: 2.1, 2.2_
  - [x] 1.2 Install dev dependencies di apps/api
    - `bun add -d drizzle-kit --filter=@pantau-pangan/api`
    - _Requirements: 2.2, 2.3_
  - [x] 1.3 Install runtime dependencies di packages/scraper
    - `bun add drizzle-orm postgres --filter=@pantau-pangan/scraper`
    - _Requirements: 9.1_
  - [x] 1.4 Create `apps/api/drizzle.config.ts`
    - defineConfig with schema path, out dir, dialect postgresql, dbCredentials from DATABASE_URL
    - _Requirements: 2.2_
  - [x] 1.5 Add database scripts to `apps/api/package.json`
    - Add `db:generate`, `db:migrate`, `db:studio` scripts
    - _Requirements: 2.3_
  - [x] 1.6 Add database scripts to root `package.json`
    - Add `db:migrate` and `db:studio` proxy scripts
    - _Requirements: 2.3_

- [x] 2. Define database schema
  - [x] 2.1 Create `apps/api/src/db/schema.ts` with all 6 tables
    - Define komoditas, provinsi, kota, pasar, hargaHarian, insightCache tables
    - Include all columns with correct types, defaults, and NOT NULL constraints
    - Define foreign key references between tables
    - Define CHECK constraint `chk_level_fk` using `sql` template literal
    - Define UNIQUE constraints (regular for now — NULLS NOT DISTINCT handled in migration)
    - Define all 3 indexes: idx_harga_komoditas_level_tanggal, idx_harga_komoditas_level_prov_tanggal (partial), idx_insight_lookup
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  - [x] 2.2 Create `apps/api/src/db/index.ts` (connection module)
    - Export configured Drizzle client using DATABASE_URL
    - Throw descriptive error if DATABASE_URL is not set
    - _Requirements: 2.1, 2.4_

- [x] 3. Generate and verify migration
  - [x] 3.1 Run `drizzle-kit generate` to create migration SQL
    - Execute from apps/api directory
    - _Requirements: 2.3_
  - [x] 3.2 Verify and fix migration for NULLS NOT DISTINCT
    - Check generated SQL for UNIQUE constraints on harga_harian and insight_cache
    - Manually add `NULLS NOT DISTINCT` to those UNIQUE constraints in the migration file
    - _Requirements: 1.5, 1.6_
  - [x] 3.3 Document migration execution
    - Ensure `bun run db:migrate` works (requires DATABASE_URL set)
    - _Requirements: 2.3_

- [x] 4. Implement shared package types
  - [x] 4.1 Define entity types in `packages/shared/src/types.ts`
    - Komoditas, Provinsi, Kota, Pasar, HargaHarian types (inferred from Drizzle schema or manually defined to avoid circular dep)
    - _Requirements: 3.1_
  - [x] 4.2 Define BI API raw types in `packages/shared/src/types.ts`
    - BiCommodityTreeNode, BiCommodityTreeLeaf, BiCommodityTreeResponse
    - BiDetailGridRow, BiDetailGridResponse
    - _Requirements: 3.2_
  - [x] 4.3 Define computed types in `packages/shared/src/types.ts`
    - BubbleData, InsightResponse, Timeframe
    - _Requirements: 3.3_

- [x] 5. Implement shared package constants
  - [x] 5.1 Define all constants in `packages/shared/src/constants.ts`
    - BI_BASE_URL = 'https://www.bi.go.id/hargapangan/WebSite/Home'
    - VOLATILITY_THRESHOLDS with per-timeframe stable/significant values
    - TIMEFRAME_DAYS mapping (1D=1, 1W=7, 1M=30, 3M=90, 1Y=365)
    - BUBBLE_MIN_RADIUS = 30, BUBBLE_MAX_RADIUS = 120
    - PRICE_TYPE_ID = 1, IS_PASOKAN = 1
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Implement shared package utils
  - [x] 6.1 Implement utility functions in `packages/shared/src/utils.ts`
    - `hitungPerubahan(hargaSekarang: number, hargaTarget: number): number`
    - `getBubbleColor(persen: number, timeframe: Timeframe): string`
    - `getBubbleRadius(persen: number, timeframe: Timeframe): number`
    - `parseDateKeys(row: Record<string, unknown>): string[]`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 6.2 Update `packages/shared/src/index.ts` to re-export all new modules
    - Re-export types, constants, and utils
    - _Requirements: 3.1, 4.1, 5.1_
  - [x] 6.3 Write property tests for shared utils
    - Install fast-check: `bun add -d fast-check`
    - Create `packages/shared/src/__tests__/utils.test.ts`
    - **Property 1: hitungPerubahan formula correctness**
    - **Property 2: getBubbleColor threshold consistency**
    - **Property 3: getBubbleRadius bounds and monotonicity**
    - **Property 4: parseDateKeys filtering and ordering**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 7. Checkpoint — Verify foundation
  - Ensure `bun run typecheck` passes across all packages
  - Ensure `bun run lint` passes
  - Ensure `bun run build` passes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement scraper fetcher
  - [x] 8.1 Create `packages/scraper/src/fetcher.ts`
    - Implement `fetchCommoditiesTree()`: GET to GetCommoditiesTree with cache buster
    - Implement `fetchDetailGrid(comId: number, provId?: number)`: GET to GetDetailGridData2 with all required params
    - Implement retry logic: up to 3 retries with exponential backoff (1s, 2s, 4s)
    - Implement courtesy delay: `Bun.sleep(100 + Math.random() * 100)` between sequential calls
    - Import BI_BASE_URL, PRICE_TYPE_ID, IS_PASOKAN from @pantau-pangan/shared
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9. Implement scraper parser
  - [x] 9.1 Create `packages/scraper/src/parser.ts`
    - Implement `parseCommoditiesTree(raw)`: extract leaf nodes with treeId, comId, nama, kategori
    - Implement `parseDetailGrid(raw, comId)`: extract rows with level, location info, date-price pairs
    - Use `parseDateKeys` from shared utils for date key extraction
    - Validate required fields, throw descriptive errors on malformed input
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 9.2 Write property tests for parser
    - Create `packages/scraper/src/__tests__/parser.test.ts`
    - **Property 5: parseCommoditiesTree extracts all leaves**
    - **Property 6: parseDetailGrid extracts all date-price pairs**
    - **Property 7: Parser rejects malformed input**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [x] 10. Implement scraper DB module
  - [x] 10.1 Create `packages/scraper/src/db.ts`
    - Standalone Drizzle connection using DATABASE_URL
    - Import schema from `../../apps/api/src/db/schema`
    - Export db instance and raw client (for connection close)
    - Throw descriptive error if DATABASE_URL not set
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 11. Implement scraper orchestrator
  - [x] 11.1 Rewrite `packages/scraper/src/index.ts` as orchestrator
    - Import fetcher, parser, and db module
    - Implement main() async function:
      1. Fetch GetCommoditiesTree → parse → upsert komoditas (onConflictDoUpdate on com_id)
      2. Loop each komoditas: fetch grid → parse → resolve geo entities → upsert harga_harian
    - Geographic entity resolution with in-memory Maps:
      - provinsiMap: nama → id (from upsert returning)
      - kotaMap: "provinsiId:nama" → id
      - pasarMap: "kotaId:nama" → id
    - Level-to-FK mapping: set provinsi_id/kota_id/pasar_id based on row level
    - Use onConflictDoNothing for harga_harian (immutable price data)
    - Error handling: try/catch per komoditas, log and continue on failure
    - Structured logging: total rows, upsert counts, latest date, duration
    - Exit code: 0 if ≥1 komoditas succeeded, 1 if all failed
    - Close DB connection before exit
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.3_
  - [x] 11.2 Write property test for level-to-FK mapping
    - Create `packages/scraper/src/__tests__/orchestrator.test.ts`
    - **Property 8: Level-to-FK mapping correctness**
    - **Validates: Requirements 8.7**

- [x] 12. Final checkpoint — Verify end-to-end
  - Ensure `bun run typecheck` passes
  - Ensure `bun run lint` passes
  - Ensure `bun run build` passes
  - Verify `bun run scrape` executes without TypeScript errors (may fail at runtime without DB — that's OK)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Task 3 (migration) requires a running PostgreSQL instance with DATABASE_URL set
- Task 12 end-to-end verification against real BI API requires both DATABASE_URL and network access
- Property tests use fast-check library with minimum 100 iterations per property
- Scraper imports schema from api package via relative path — works with Bun's module resolution in monorepo
