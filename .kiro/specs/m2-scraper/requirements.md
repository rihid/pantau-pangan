# Requirements Document — M2 Scraper

## Introduction

M2 Scraper adalah milestone kedua dari project Pantau Pangan yang bertanggung jawab untuk mengambil data harga pangan dari API publik Bank Indonesia PIHPS, mem-parsing response, dan menyimpannya ke PostgreSQL via Drizzle ORM. Milestone ini mencakup setup database (schema + migrasi), definisi types/constants/utils di shared package, implementasi scraper (fetcher + parser + orchestrator), dan integrasi scraper-to-DB dengan upsert idempotent.

## Glossary

- **Scraper**: Proses otomatis yang mengambil data dari API BI PIHPS dan menyimpannya ke database
- **BI_API**: API publik Bank Indonesia Pusat Informasi Harga Pangan Strategis Nasional di `bi.go.id/hargapangan`
- **Fetcher**: Modul yang melakukan HTTP request ke BI API menggunakan Bun native fetch
- **Parser**: Modul yang mentransformasi raw JSON response dari BI API menjadi tipe internal aplikasi
- **Orchestrator**: Modul utama scraper yang mengkoordinasikan fetcher, parser, dan operasi database
- **Drizzle_ORM**: Object-Relational Mapping library yang digunakan untuk interaksi dengan PostgreSQL
- **Upsert**: Operasi INSERT yang melakukan UPDATE jika row sudah ada (idempotent)
- **Komoditas**: Barang pangan strategis yang dipantau (21 item dari BI)
- **Level**: Tingkat granularitas geografis data harga (0=nasional, 1=provinsi, 2=kota, 3=pasar)
- **Date_Key**: Key dinamis dalam response BI berformat "DD/MM/YYYY" yang berisi harga pada tanggal tersebut
- **Shared_Package**: Package `@pantau-pangan/shared` yang berisi types, constants, dan utils yang dipakai lintas package
- **DB_Module**: Modul koneksi database Drizzle di `apps/api/src/db/`

## Requirements

### Requirement 1: Database Schema Definition

**User Story:** As a developer, I want a well-defined database schema using Drizzle ORM, so that the scraper can persist price data in a structured and queryable format.

#### Acceptance Criteria

1. THE Drizzle_ORM schema SHALL define a `komoditas` table with columns: id (serial PK), tree_id (varchar 10, not null), com_id (integer, not null, unique), nama (varchar 100, not null), kategori (varchar 50, not null), satuan (varchar 20, default 'kg'), created_at (timestamptz), updated_at (timestamptz)
2. THE Drizzle_ORM schema SHALL define a `provinsi` table with columns: id (serial PK), bi_id (integer, not null, unique), nama (varchar 100, not null, unique), created_at (timestamptz)
3. THE Drizzle_ORM schema SHALL define a `kota` table with columns: id (serial PK), provinsi_id (integer FK to provinsi, not null), nama (varchar 100, not null), created_at (timestamptz), with UNIQUE constraint on (provinsi_id, nama)
4. THE Drizzle_ORM schema SHALL define a `pasar` table with columns: id (serial PK), kota_id (integer FK to kota, not null), nama (varchar 100, not null), created_at (timestamptz), with UNIQUE constraint on (kota_id, nama)
5. THE Drizzle_ORM schema SHALL define a `harga_harian` table with columns: id (serial PK), komoditas_id (integer FK, not null), level (smallint, not null), provinsi_id (integer FK, nullable), kota_id (integer FK, nullable), pasar_id (integer FK, nullable), harga (numeric 12,2, not null), tanggal (date, not null), created_at (timestamptz), with CHECK constraint `chk_level_fk` and UNIQUE NULLS NOT DISTINCT on (komoditas_id, level, provinsi_id, kota_id, pasar_id, tanggal)
6. THE Drizzle_ORM schema SHALL define an `insight_cache` table with columns: id (serial PK), komoditas_id (integer FK, not null), provinsi_id (integer FK, nullable), cache_date (date, not null), insight (text, not null), generated_at (timestamptz), with UNIQUE NULLS NOT DISTINCT on (komoditas_id, provinsi_id, cache_date)
7. THE Drizzle_ORM schema SHALL define indexes: idx_harga_komoditas_level_tanggal, idx_harga_komoditas_level_prov_tanggal (partial WHERE level >= 1), and idx_insight_lookup

### Requirement 2: Database Connection and Migration

**User Story:** As a developer, I want a working database connection module and migration setup, so that I can apply schema changes and connect to PostgreSQL from the application.

#### Acceptance Criteria

1. THE DB_Module SHALL export a configured Drizzle client instance from `apps/api/src/db/index.ts` using the DATABASE_URL environment variable
2. THE DB_Module SHALL provide a `drizzle.config.ts` file at the api package root that points to the schema file and uses DATABASE_URL
3. WHEN `db:migrate` script is executed, THE Drizzle_ORM SHALL apply all pending migrations to the target PostgreSQL database
4. WHEN DATABASE_URL is not set or invalid, THE DB_Module SHALL throw a descriptive error at startup

### Requirement 3: Shared Package Types

**User Story:** As a developer, I want shared TypeScript types that match the database schema and BI API responses, so that all packages use consistent type definitions.

#### Acceptance Criteria

1. THE Shared_Package SHALL export types matching database entities: Komoditas, HargaHarian, Provinsi, Kota, Pasar
2. THE Shared_Package SHALL export types for raw BI API responses: BiCommodityTreeNode (category parent), BiCommodityTreeLeaf (leaf with comId), BiDetailGridRow (row with dynamic date keys)
3. THE Shared_Package SHALL export computed types: BubbleData, InsightResponse, Timeframe

### Requirement 4: Shared Package Constants

**User Story:** As a developer, I want centralized constants for BI API configuration and bubble chart parameters, so that all packages reference a single source of truth.

#### Acceptance Criteria

1. THE Shared_Package SHALL export BI_BASE_URL as `https://www.bi.go.id/hargapangan/WebSite/Home`
2. THE Shared_Package SHALL export VOLATILITY_THRESHOLDS with per-timeframe stable and significant values matching architecture.md
3. THE Shared_Package SHALL export TIMEFRAME_DAYS mapping (1D=1, 1W=7, 1M=30, 3M=90, 1Y=365)
4. THE Shared_Package SHALL export BUBBLE_MIN_RADIUS (30) and BUBBLE_MAX_RADIUS (120)
5. THE Shared_Package SHALL export PRICE_TYPE_ID (1) and IS_PASOKAN (1)

### Requirement 5: Shared Package Utils

**User Story:** As a developer, I want utility functions for price calculations and bubble chart rendering, so that business logic is centralized and reusable.

#### Acceptance Criteria

1. WHEN `hitungPerubahan` is called with hargaSekarang and hargaTarget, THE Shared_Package SHALL return the percentage change calculated as ((hargaSekarang - hargaTarget) / hargaTarget) \* 100
2. WHEN `getBubbleColor` is called with a percentage and timeframe, THE Shared_Package SHALL return the correct hex color based on VOLATILITY_THRESHOLDS for that timeframe
3. WHEN `getBubbleRadius` is called with a percentage and timeframe, THE Shared_Package SHALL return a radius between BUBBLE_MIN_RADIUS and BUBBLE_MAX_RADIUS, proportional to |percentage| / significant threshold
4. WHEN `parseDateKeys` is called with a BI response row object, THE Shared_Package SHALL return an array of date key strings matching the pattern DD/MM/YYYY, sorted ascending

### Requirement 6: Scraper Fetcher

**User Story:** As a developer, I want a fetcher module that retrieves data from BI API endpoints, so that the scraper can obtain fresh price data.

#### Acceptance Criteria

1. WHEN `fetchCommoditiesTree` is called, THE Fetcher SHALL make a GET request to `{BI_BASE_URL}/GetCommoditiesTree?_={timestamp}` and return the raw JSON response
2. WHEN `fetchDetailGrid` is called with a comId and optional provId, THE Fetcher SHALL make a GET request to `{BI_BASE_URL}/GetDetailGridData2` with parameters ProvId, PriceTypeId=1, ComId, date, isPasokan=1, and cache buster timestamp
3. WHILE making sequential requests, THE Fetcher SHALL wait 100-200ms between each request as a courtesy delay
4. IF a request fails with a network or HTTP error, THEN THE Fetcher SHALL retry the request up to 3 times with exponential backoff before throwing an error

### Requirement 7: Scraper Parser

**User Story:** As a developer, I want a parser module that transforms raw BI API responses into structured internal types, so that data can be cleanly inserted into the database.

#### Acceptance Criteria

1. WHEN `parseCommoditiesTree` is called with raw BI tree response, THE Parser SHALL return a structured array of komoditas objects with tree_id, com_id, nama, and kategori extracted from leaf nodes
2. WHEN `parseDetailGrid` is called with raw BI grid response and comId, THE Parser SHALL return an array of parsed rows containing: level, location identifiers (id, name, category), and an array of date-price pairs extracted from dynamic date keys
3. WHEN a row in the grid response has dynamic keys matching DD/MM/YYYY pattern, THE Parser SHALL extract all such keys as date-price pairs
4. IF the raw response structure is malformed or missing expected fields, THEN THE Parser SHALL throw a descriptive error indicating which field is missing or invalid

### Requirement 8: Scraper Orchestrator

**User Story:** As a developer, I want a scraper orchestrator that coordinates fetching, parsing, and database persistence, so that a single `bun run scrape` command populates the database with fresh data.

#### Acceptance Criteria

1. WHEN the Orchestrator runs, THE Orchestrator SHALL first fetch GetCommoditiesTree and upsert all 21 komoditas into the komoditas table
2. WHEN the Orchestrator processes each komoditas, THE Orchestrator SHALL fetch GetDetailGridData2, parse the response, upsert new geographic entities (provinsi, kota, pasar) into their respective tables, and upsert all price rows into harga_harian
3. THE Orchestrator SHALL use Drizzle onConflictDoUpdate for all upsert operations to ensure idempotent writes
4. WHEN the Orchestrator completes successfully, THE Orchestrator SHALL log structured output including: total rows processed, upsert counts per table, latest date found, and total duration
5. IF any komoditas fetch or parse fails, THEN THE Orchestrator SHALL log the error for that komoditas and continue processing remaining komoditas
6. WHEN the Orchestrator completes, THE Orchestrator SHALL exit with code 0 on success (at least one komoditas processed) or code 1 if all komoditas failed
7. WHEN upserting harga_harian rows, THE Orchestrator SHALL correctly set provinsi_id, kota_id, and pasar_id based on the row level (null for levels above the row's level) to satisfy the chk_level_fk constraint

### Requirement 9: Scraper Database Connection

**User Story:** As a developer, I want the scraper package to have its own database connection, so that it can run as a standalone process independent of the API server.

#### Acceptance Criteria

1. THE Scraper SHALL maintain its own Drizzle client instance configured via DATABASE_URL environment variable
2. THE Scraper SHALL import schema definitions from the api package or share them via a common location
3. WHEN the scraper process ends, THE Scraper SHALL properly close the database connection

### Requirement 10: Cron Scheduling

**User Story:** As a developer, I want the scraper to run on a schedule, so that price data is automatically updated multiple times per day.

#### Acceptance Criteria

1. THE Scraper SHALL be executable manually via `bun run scrape` command
2. WHERE cron scheduling is enabled, THE Scraper SHALL run at 07:00, 11:00, and 15:00 WIB
3. WHEN the latest tanggal in harga_harian from the current scrape is less than today (WIB), THE Scraper SHALL indicate that a retry is needed at the next scheduled time
4. WHEN the latest tanggal equals today (WIB) or the 15:00 run completes, THE Scraper SHALL not schedule further retries for the day
