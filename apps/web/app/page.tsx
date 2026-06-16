'use client'

import { useState } from 'react'
import type { Timeframe } from '@pantau-pangan/shared'
import { useKomoditas } from '@/lib/hooks/use-komoditas'
import { useDataRange } from '@/lib/hooks/use-data-range'
import { TimeframeFilter } from '@/components/filters/timeframe-filter'
import { ProvinsiFilter } from '@/components/filters/provinsi-filter'
import { SearchFilter } from '@/components/filters/search-filter'
import { ThemeToggle } from '@/components/theme-toggle'
import { DataFooter } from '@/components/data-footer'
import dynamic from 'next/dynamic'

const BubbleChartContainer = dynamic(
  () =>
    import('@/components/bubble-chart/bubble-chart-container').then(
      (mod) => mod.BubbleChartContainer,
    ),
  { ssr: false },
)

export default function HomePage() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D')
  const [provinsiId, setProvinsiId] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, isError, isRefetching, refetch } = useKomoditas(timeframe, provinsiId)
  const { disabledTimeframes, availableDays, dataRange } = useDataRange(provinsiId)

  const handleTimeframeChange = (tf: Timeframe) => {
    if (!disabledTimeframes.has(tf)) setTimeframe(tf)
  }

  const handleRefresh = () => {
    void refetch()
  }

  return (
    <main className="flex flex-col h-dvh overflow-hidden bg-linear-to-b from-zinc-950 via-slate-950 to-black text-foreground relative">
      {/* Floating Header */}
      <header className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-3 pointer-events-none">
        {/* Logo + title */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center text-black font-bold text-lg shadow-[0_0_15px_rgba(34,197,94,0.5)]">
            P
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white hidden sm:block">
            PANTAU PANGAN
          </h1>
        </div>

        {/* Desktop: timeframe + search in center-ish area */}
        <div className="hidden md:flex items-center gap-2 pointer-events-auto">
          <TimeframeFilter
            value={timeframe}
            onChange={handleTimeframeChange}
            disabledTimeframes={disabledTimeframes}
            availableDays={availableDays}
          />
          <SearchFilter value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <ProvinsiFilter value={provinsiId} onChange={setProvinsiId} />
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefetching}
            aria-label="Refresh data"
            title="Refresh data"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            <svg
              className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`}
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

      {/* Bubble chart canvas — full height minus footer space */}
      <div className="flex-1 w-full h-full min-h-0 pt-16 pb-10 md:pb-6">
        <BubbleChartContainer
          data={data ?? []}
          isLoading={isLoading}
          isError={isError}
          isRefetching={isRefetching}
          onRetry={handleRefresh}
          provinsiId={provinsiId}
          searchQuery={searchQuery}
        />
      </div>

      {/* Mobile: floating timeframe dock + search */}
      <div className="md:hidden absolute bottom-14 inset-x-0 z-10 flex flex-col items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto">
          <SearchFilter value={searchQuery} onChange={setSearchQuery} />
        </div>
        <div className="pointer-events-auto">
          <TimeframeFilter
            value={timeframe}
            onChange={handleTimeframeChange}
            disabledTimeframes={disabledTimeframes}
            availableDays={availableDays}
          />
        </div>
      </div>

      {/* Footer — absolute bottom strip */}
      <div className="absolute bottom-0 inset-x-0 z-10">
        <DataFooter
          latestDate={dataRange?.newestDate ?? undefined}
          earliestDate={dataRange?.oldestDate ?? undefined}
        />
      </div>
    </main>
  )
}
