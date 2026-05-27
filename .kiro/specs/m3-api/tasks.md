# Implementation Plan: M3 API

## Overview

Implementasi REST API layer menggunakan Hono.js 4.x + Bun runtime dengan arsitektur thin route handler → service layer → data layer. Terdapat 5 endpoint utama yang menyediakan data komoditas (bubble chart), historis harga, detail geografis (proxy BI), insight LLM, dan daftar provinsi. Semua query menggunakan Drizzle ORM, testing menggunakan Bun test runner + fast-check untuk property-based tests.

## Tasks

- [x] 1. Set up foundational infrastructure
  - [x] 1.1 Create ApiError class and validation helpers in `src/lib/validators.ts`
    - Implement `ApiError` class extending Error with `status` field
    - Implement `parseIntParam(value, paramName)` — throws ApiError(400) for non-positive-integer
    - Implement `validateTimeframe(value)` — throws ApiError(400) for invalid timeframe
    - Implement `validateProvinsiId(value)` — throws ApiError(400) for non-integer or negative
    - Export `VALID_TIMEFRAMES` array for reuse
    - _Requirements: 7.3, 1.7, 1.8, 2.5, 2.6, 3.8, 3.10_

  - [x] 1.2 Create global error handler middleware in `src/middleware/error-handler.ts`
    - Implement `errorHandler` middleware that wraps `await next()` in try/catch
    - If error is `ApiError`, return `c.json({ error, status }, status)`
    - If error is unknown, log to console.error and return generic 500 without stack trace
    - _Requirements: 7.1, 7.4, 7.5_

  - [x] 1.3 Update `src/index.ts` entry point to mount middleware and route placeholders
    - Import and apply `errorHandler` middleware via `app.use('*', errorHandler)`
    - Keep existing health check at `GET /`
    - Prepare route mounting structure (komoditas, provinsi, insight routes)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 1.4 Install fast-check as dev dependency
    - Run `bun add -d fast-check --filter=@pantau-pangan/api`
    - _Requirements: Testing infrastructure_

- [x] 2. Implement komoditas service and route
  - [x] 2.1 Create `src/services/komoditas.service.ts` with `getAllKomoditas` function
    - Implement `getAllKomoditas(provinsiId: number, timeframe: Timeframe): Promise<BubbleData[]>`
    - Determine level (0 if provinsiId=0, else 1) and calculate target date from TIMEFRAME_DAYS
    - Query harga terbaru per komoditas using `DISTINCT ON` via `db.execute(sql\`...\`)`
    - Query harga target per komoditas using `DISTINCT ON` with `tanggal <= targetDate`
    - Map results using `hitungPerubahan`, `getBubbleRadius`, `getBubbleColor` from shared
    - Handle komoditas without price data: return defaults (harga=0, perubahan=0, radius=30, color=#6b7280)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.10, 1.11_

  - [x] 2.2 Add `getProvinsiList` function to `src/services/komoditas.service.ts`
    - Implement `getProvinsiList(): Promise<Array<{id, biId, nama}>>`
    - Query all provinsi ordered by nama ascending
    - Select only id, biId, nama fields (exclude createdAt)
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 2.3 Add `getDetail` function to `src/services/komoditas.service.ts`
    - Implement `getDetail(komoditasId: number, provinsiId: number): Promise<unknown>`
    - Lookup komoditas by id, throw ApiError(404) if not found
    - Lookup provinsi bi_id if provinsiId > 0, throw ApiError(404) if not found
    - Build BI API URL with params: ProvId, PriceTypeId=1, ComId, date (today en-GB), isPasokan=1, \_ (timestamp)
    - Fetch with 10s AbortController timeout
    - Return BI response JSON as-is (pass-through), throw ApiError(502) on failure/timeout
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9_

  - [x] 2.4 Create `src/routes/komoditas.ts` with all 3 endpoint handlers
    - `GET /` — validate timeframe + provinsiId, call `getAllKomoditas`, return JSON
    - `GET /:id/historis` — validate id + provinsiId, call `getHistoris`, return JSON
    - `GET /:id/detail` — validate id + provinsiId, call `getDetail`, return JSON
    - Each handler max 15 lines effective code, no DB imports
    - _Requirements: 1.9, 2.8, 3.11, 6.1, 6.2, 6.3, 6.5_

  - [x] 2.5 Write property tests for validators (`src/__tests__/lib/validators.test.ts`)
    - **Property 4: Input Validation Rejects Invalid Params**
    - Test: any string not in {1D,1W,1M,3M,1Y} → ApiError(400) with param name
    - Test: any non-integer or negative provinsiId → ApiError(400) with param name
    - Test: any non-positive-integer id → ApiError(400) with param name
    - Test: valid inputs pass through correctly
    - **Validates: Requirements 1.7, 1.8, 2.5, 2.6, 3.8, 3.10, 7.3**

  - [x] 2.6 Write property test for bubble calculation consistency (`src/__tests__/services/komoditas.service.test.ts`)
    - **Property 2: Bubble Calculation Consistency with Shared Utils**
    - Test: for any harga pair (h1, h2) and timeframe t, perubahan === hitungPerubahan(h1, h2), radius === getBubbleRadius(perubahan, t), color === getBubbleColor(perubahan, t)
    - **Validates: Requirements 1.2, 1.5, 1.10**

- [x] 3. Implement harga service
  - [x] 3.1 Create `src/services/harga.service.ts` with `getHistoris` function
    - Implement `getHistoris(komoditasId: number, provinsiId: number): Promise<Array<{tanggal, harga}>>`
    - Verify komoditas exists, throw ApiError(404) if not found
    - Determine level (0 if provinsiId=0, else 1)
    - Query harga_harian filtered by komoditas_id, level, provinsi_id, ordered DESC, limit 365
    - Reverse result for ascending order (oldest first for line chart)
    - Map harga to Number (from numeric string)
    - Return empty array if no data found (HTTP 200)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7_

  - [x] 3.2 Write property test for historis ordering and limit (`src/__tests__/services/harga.service.test.ts`)
    - **Property 6: Historis Output Ordering and Limit**
    - Test: output array is sorted ascending by tanggal
    - Test: output length <= 365
    - **Validates: Requirements 2.1**

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement insight service and route
  - [x] 5.1 Create `src/services/insight.service.ts` with `getInsight` function
    - Implement `getInsight(komoditasId: number, provinsiId: number): Promise<InsightResponse>`
    - Check OPENROUTER_API_KEY exists, throw ApiError(503) if missing
    - Verify komoditas exists, throw ApiError(404) if not found
    - Implement `getTodayWIB()` helper — returns YYYY-MM-DD in UTC+7
    - Check insight_cache for (komoditas_id, provinsi_id, today_wib) — return cached if found
    - Build prompt via `buildInsightPrompt` with 30-day historis, harga hari ini/kemarin, perubahan
    - Call OpenRouter API with 30s timeout, model `anthropic/claude-3.5-haiku`, max_tokens 1024
    - Save result to insight_cache, return with cached: false
    - Handle timeout/error → ApiError(502)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.11_

  - [x] 5.2 Create `src/routes/insight.ts` with insight endpoint handler
    - `GET /:id/insight` — validate id + provinsiId, call `getInsight`, return JSON
    - Handler max 15 lines effective code, no DB/LLM imports
    - _Requirements: 4.10, 6.1, 6.2, 6.3, 6.5_

  - [x] 5.3 Write property test for insight cache round-trip (`src/__tests__/services/insight.service.test.ts`)
    - **Property 7: Insight Cache Round-Trip**
    - Test: if cache exists for today WIB → return cached: true without LLM call
    - Test: if no cache → LLM called, result saved, return cached: false
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 6. Implement provinsi route and wire everything together
  - [x] 6.1 Create `src/routes/provinsi.ts` with list endpoint
    - `GET /` — call `getProvinsiList`, return JSON
    - Handler max 15 lines effective code
    - _Requirements: 5.4, 6.1, 6.2, 6.5_

  - [x] 6.2 Wire all routes in `src/index.ts`
    - Import and mount komoditasRoutes at `/komoditas`
    - Import and mount insightRoutes at `/komoditas` (nested /:id/insight)
    - Import and mount provinsiRoutes at `/provinsi`
    - Verify health check still works at `GET /`
    - _Requirements: 8.1, 6.1_

  - [x] 6.3 Write property test for provinsi list sorting (`src/__tests__/services/komoditas.service.test.ts`)
    - **Property 10: Provinsi List Sorted and Field-Complete**
    - Test: output sorted ascending by nama
    - Test: each object has exactly 3 fields (id, biId, nama)
    - **Validates: Requirements 5.1, 5.2**

- [x] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integration tests and remaining property tests
  - [x] 8.1 Write property test for level selection consistency (`src/__tests__/services/level-selection.test.ts`)
    - **Property 1: Level Selection Consistency**
    - Test: provinsiId=0 → level=0, provinsi_id IS NULL in query
    - Test: provinsiId>0 → level=1, provinsi_id matches in query
    - Applies across all services (komoditas, harga, insight)
    - **Validates: Requirements 1.3, 1.4, 2.2, 2.3, 4.5, 4.6**

  - [x] 8.2 Write property test for error response format (`src/__tests__/middleware/error-handler.test.ts`)
    - **Property 9: Error Response Format Consistency**
    - Test: for any ApiError(status, message), response has exactly {error, status} fields
    - Test: 500 errors never contain stack trace, table names, or query details
    - **Validates: Requirements 7.1, 7.4, 7.5**

  - [x] 8.3 Write integration tests for route → service flow (`src/__tests__/routes/integration.test.ts`)
    - Test full request flow for each endpoint using Hono test client
    - Test validation errors return proper 400 responses
    - Test 404 for non-existent resources
    - Mock external services (BI API, OpenRouter) for deterministic tests
    - _Requirements: 1.7, 1.8, 2.4, 2.5, 3.6, 3.7, 4.7, 4.8, 7.1, 7.2, 7.3_

- [x] 9. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- `fast-check` is used for property-based testing, `bun:test` as the test runner
- Services receive primitive params (number, string) — not Hono request objects
- `DISTINCT ON` queries use `db.execute(sql\`...\`)` which is still Drizzle API (type-safe template literal)
- All shared utils (hitungPerubahan, getBubbleColor, getBubbleRadius, TIMEFRAME_DAYS) are imported from `@pantau-pangan/shared`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.4"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["2.4", "2.5", "2.6", "3.2"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3"] },
    { "id": 7, "tasks": ["8.1", "8.2", "8.3"] }
  ]
}
```
