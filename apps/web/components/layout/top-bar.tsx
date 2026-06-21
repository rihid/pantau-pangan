'use client'

import type { Timeframe } from '@pantau-pangan/shared'
import { TimeframeFilter } from '@/components/filters/timeframe-filter'
import { ProvinsiFilter } from '@/components/filters/provinsi-filter'
import { SearchFilter } from '@/components/filters/search-filter'
import { ThemeToggle } from '@/components/theme-toggle'

interface TopBarProps {
  timeframe: Timeframe
  onTimeframeChange: (tf: Timeframe) => void
  disabledTimeframes: Set<Timeframe>
  availableDays: number
  provinsiId: number
  onProvinsiChange: (id: number) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  onRefresh: () => void
  isRefetching: boolean
  /** Untuk indikator "live" di logo — ping hanya saat data sehat. */
  isLive: boolean
}

/**
 * Top bar dashboard — glass row solid (bukan kontrol mengambang yang tersebar).
 * Logo + judul di kiri, timeframe + search di tengah (md+), provinsi/refresh/theme di kanan.
 * Komposisi mengikuti Image #6 (Orion).
 */
export function TopBar({
  timeframe,
  onTimeframeChange,
  disabledTimeframes,
  availableDays,
  provinsiId,
  onProvinsiChange,
  searchQuery,
  onSearchChange,
  onRefresh,
  isRefetching,
  isLive,
}: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-3 h-14 px-3 sm:px-4 border-b border-border bg-background/70 backdrop-blur-md">
      {/* Logo + title */}
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8 rounded-full bg-linear-to-br from-padi-green to-padi-green-deep flex items-center justify-center text-black font-bold text-lg shadow-[0_0_15px_var(--padi-green-glow)]">
          P
          {isLive && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-padi-green opacity-75 animate-ping motion-reduce:animate-none" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-padi-green border-2 border-background" />
            </span>
          )}
        </div>
        <h1 className="text-lg font-bold tracking-tight text-foreground hidden sm:block">
          PANTAU PANGAN
        </h1>
      </div>

      {/* Center: timeframe + search (md+) */}
      <nav aria-label="Filter dan navigasi" className="hidden md:flex items-center gap-2">
        <TimeframeFilter
          value={timeframe}
          onChange={onTimeframeChange}
          disabledTimeframes={disabledTimeframes}
          availableDays={availableDays}
        />
        <SearchFilter value={searchQuery} onChange={onSearchChange} />
      </nav>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <ProvinsiFilter value={provinsiId} onChange={onProvinsiChange} />
        <button
          onClick={onRefresh}
          disabled={isRefetching}
          aria-label="Refresh data"
          title="Refresh data"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-background/80 backdrop-blur-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-padi-green/60"
        >
          <svg
            className={`w-4 h-4 ${isRefetching ? 'animate-spin motion-reduce:animate-none' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}
