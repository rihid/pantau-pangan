import cron from 'node-cron'
import { runScraper } from '@pantau-pangan/scraper'

// Module-level state — in-memory, reset saat process restart
let todayDone = false

// Exported only for testing
export function _resetTodayDone(): void {
  todayDone = false
}

export function _getTodayDone(): boolean {
  return todayDone
}

/** Get today's date in WIB (UTC+7) as YYYY-MM-DD string */
function getTodayWIB(): string {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().split('T')[0]!
}

/**
 * Determines if the scraper should run.
 * Returns true iff data for today hasn't been fetched yet.
 * runNumber doesn't affect the result — only todayDone matters.
 */
export function shouldRunScraper(todayDone: boolean, runNumber: 1 | 2 | 3): boolean {
  void runNumber // runNumber doesn't affect the result per spec
  return !todayDone
}

/** Executes one scraper run, updating todayDone flag on success */
async function runCronJob(runNumber: 1 | 2 | 3): Promise<void> {
  if (!shouldRunScraper(todayDone, runNumber)) {
    console.warn(
      JSON.stringify({ skipped: true, reason: 'data hari ini sudah tersedia', runNumber }),
    )
    return
  }

  try {
    const result = await runScraper()

    if (result.maxTanggal === getTodayWIB()) {
      todayDone = true
      console.warn(
        JSON.stringify({
          success: true,
          runNumber,
          rowsInserted: result.rowsInserted,
          rowsUpserted: result.rowsUpserted,
          maxTanggal: result.maxTanggal,
          durationMs: result.durationMs,
          errors: result.errors,
        }),
      )
    } else {
      console.warn(
        JSON.stringify({
          success: false,
          runNumber,
          maxTanggal: result.maxTanggal,
          today: getTodayWIB(),
          note: 'maxTanggal tidak cocok dengan hari ini',
          rowsInserted: result.rowsInserted,
          durationMs: result.durationMs,
          errors: result.errors,
        }),
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ error: true, runNumber, message }))
    // Do NOT re-throw — scheduler continues without exiting the process
  }
}

/** Registers four cron jobs: three scrape runs + midnight reset */
export function initScheduler(): void {
  // Run 1 — 07:00 WIB
  cron.schedule('0 0 7 * * *', () => void runCronJob(1), {
    timezone: 'Asia/Jakarta',
  })

  // Run 2 — 11:00 WIB
  cron.schedule('0 0 11 * * *', () => void runCronJob(2), {
    timezone: 'Asia/Jakarta',
  })

  // Run 3 — 15:00 WIB
  cron.schedule('0 0 15 * * *', () => void runCronJob(3), {
    timezone: 'Asia/Jakarta',
  })

  // Midnight reset — 00:00 WIB
  cron.schedule(
    '0 0 0 * * *',
    () => {
      todayDone = false
      console.warn(JSON.stringify({ reset: true, message: 'todayDone reset to false' }))
    },
    { timezone: 'Asia/Jakarta' },
  )

  console.warn('[scheduler] Initialized — 3 scrape jobs + 1 midnight reset registered')
}
