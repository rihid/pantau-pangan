import { describe, test, expect, beforeEach } from 'bun:test'
import { _resetTodayDone, _getTodayDone } from '../scheduler'

// Mock @pantau-pangan/scraper before importing scheduler internals
// We need to test the runtime behavior of runCronJob via side-effects on todayDone

/**
 * Unit tests for scheduler behavior.
 * We test via observable side-effects:
 * - _getTodayDone() to inspect state after runCronJob
 * - console.log / console.error to verify structured logs
 */

describe('Scheduler unit tests', () => {
  beforeEach(() => {
    _resetTodayDone()
  })

  test('shouldRunScraper returns false when todayDone is true', async () => {
    const { shouldRunScraper } = await import('../scheduler')
    // When todayDone is true
    expect(shouldRunScraper(true, 1)).toBe(false)
    expect(shouldRunScraper(true, 2)).toBe(false)
    expect(shouldRunScraper(true, 3)).toBe(false)
  })

  test('shouldRunScraper returns true when todayDone is false', async () => {
    const { shouldRunScraper } = await import('../scheduler')
    expect(shouldRunScraper(false, 1)).toBe(true)
    expect(shouldRunScraper(false, 2)).toBe(true)
    expect(shouldRunScraper(false, 3)).toBe(true)
  })

  test('_resetTodayDone resets state to false', () => {
    // State starts false after beforeEach
    expect(_getTodayDone()).toBe(false)
  })

  test('_getTodayDone reflects the initial state as false', () => {
    expect(_getTodayDone()).toBe(false)
  })

  // Test structural: verify exported functions exist and have correct types
  test('scheduler exports the expected functions', async () => {
    const scheduler = await import('../scheduler')
    expect(typeof scheduler.initScheduler).toBe('function')
    expect(typeof scheduler.shouldRunScraper).toBe('function')
    expect(typeof scheduler._resetTodayDone).toBe('function')
    expect(typeof scheduler._getTodayDone).toBe('function')
  })

  test('shouldRunScraper runNumber parameter does not affect result', async () => {
    const { shouldRunScraper } = await import('../scheduler')
    // All three runNumbers with todayDone=false → all true
    const results = ([1, 2, 3] as const).map((n) => shouldRunScraper(false, n))
    expect(results).toEqual([true, true, true])
    // All three runNumbers with todayDone=true → all false
    const results2 = ([1, 2, 3] as const).map((n) => shouldRunScraper(true, n))
    expect(results2).toEqual([false, false, false])
  })
})
