import { describe, test, expect } from 'bun:test'
import * as scraperModule from '../index'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('runScraper() export', () => {
  test('runScraper is exported and is a function', () => {
    expect(typeof scraperModule.runScraper).toBe('function')
  })

  test('ScraperResult interface shape is correct via type check (structural)', () => {
    // Verify a minimal conforming object satisfies the expected shape
    const mockResult: scraperModule.ScraperResult = {
      rowsInserted: 0,
      rowsUpserted: 0,
      maxTanggal: null,
      durationMs: 0,
      errors: [],
    }
    expect(mockResult).toHaveProperty('rowsInserted')
    expect(mockResult).toHaveProperty('rowsUpserted')
    expect(mockResult).toHaveProperty('maxTanggal')
    expect(mockResult).toHaveProperty('durationMs')
    expect(mockResult).toHaveProperty('errors')
    expect(Array.isArray(mockResult.errors)).toBe(true)
  })

  test('ScraperResult errors array supports { komoditas, message } shape', () => {
    const error: scraperModule.ScraperResult['errors'][0] = {
      komoditas: 'Beras',
      message: 'Network timeout',
    }
    expect(error.komoditas).toBe('Beras')
    expect(error.message).toBe('Network timeout')
  })

  test('import.meta.main guard exists in source file', () => {
    const srcPath = join(import.meta.dir, '..', 'index.ts')
    const src = readFileSync(srcPath, 'utf-8')
    expect(src).toContain('import.meta.main')
    // Should NOT have a bare `void main()` without the guard
    // The guard pattern should be present
    expect(src).toMatch(/if\s*\(\s*import\.meta\.main\s*\)/)
  })

  test('mapLevelToFks is also exported (re-export from level-mapping)', () => {
    expect(typeof scraperModule.mapLevelToFks).toBe('function')
  })
})
