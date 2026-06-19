'use client'

import { useState } from 'react'
import type { BubbleData, Timeframe } from '@pantau-pangan/shared'
import { useKomoditas } from '@/lib/hooks/use-komoditas'
import { useDataRange } from '@/lib/hooks/use-data-range'
import { TimeframeFilter } from '@/components/filters/timeframe-filter'
import { ProvinsiFilter } from '@/components/filters/provinsi-filter'
import { SearchFilter } from '@/components/filters/search-filter'
import { ThemeToggle } from '@/components/theme-toggle'
import { DataFooter } from '@/components/data-footer'
import { KomoditasModal } from '@/components/modal/komoditas-modal'
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
  const [modalState, setModalState] = useState<{
    komoditasId: number
    nama: string
    harga: number
    provinsiId: number
  } | null>(null)

  const { data, isLoading, isError, isRefetching, refetch } = useKomoditas(timeframe, provinsiId)
  const { disabledTimeframes, availableDays, dataRange } = useDataRange(provinsiId)

  const handleTimeframeChange = (tf: Timeframe) => {
    if (!disabledTimeframes.has(tf)) setTimeframe(tf)
  }

  const handleRefresh = () => {
    void refetch()
  }

  const handleBubbleClick = (bubble: BubbleData) => {
    setModalState({
      komoditasId: bubble.komoditasId,
      nama: bubble.nama,
      harga: bubble.harga,
      provinsiId,
    })
  }

  return (
    <>
      {/* Skip link — first focusable element for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-padi-green/70"
      >
        Lewati ke konten utama
      </a>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-col h-dvh overflow-hidden bg-page-gradient text-foreground relative"
      >
        {/* Floating Header */}
        <header className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-3 pointer-events-none">
          {/* Logo + title */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="relative w-8 h-8 rounded-full bg-linear-to-br from-padi-green to-padi-green-deep flex items-center justify-center text-black font-bold text-lg shadow-[0_0_15px_var(--padi-green-glow)]">
              P
              {!isLoading && !isError && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5"
                  aria-hidden="true"
                >
                  <span className="absolute inline-flex h-full w-full rounded-full bg-padi-green opacity-75 animate-ping motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-padi-green border-2 border-background" />
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground hidden sm:block">
              PANTAU PANGAN
            </h1>
          </div>

          {/* Desktop: timeframe + search in center-ish area */}
          <nav
            aria-label="Filter dan navigasi"
            className="hidden md:flex items-center gap-2 pointer-events-auto"
          >
            <TimeframeFilter
              value={timeframe}
              onChange={handleTimeframeChange}
              disabledTimeframes={disabledTimeframes}
              availableDays={availableDays}
            />
            <SearchFilter value={searchQuery} onChange={setSearchQuery} />
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <ProvinsiFilter value={provinsiId} onChange={setProvinsiId} />
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isRefetching}
              aria-label="Refresh data"
              title="Refresh data"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-background/80 backdrop-blur-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-padi-green/60"
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
            onBubbleClick={handleBubbleClick}
          />
        </div>

        {/* Mobile: floating timeframe dock + search */}
        <nav
          aria-label="Filter dan navigasi mobile"
          className="md:hidden absolute bottom-14 inset-x-0 z-10 flex flex-col items-center gap-2 pointer-events-none"
        >
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
        </nav>

        {/* Footer — absolute bottom strip */}
        <div className="absolute bottom-0 inset-x-0 z-10">
          <DataFooter
            latestDate={dataRange?.newestDate ?? undefined}
            earliestDate={dataRange?.oldestDate ?? undefined}
          />
        </div>

        {/* Modal detail komoditas */}
        <KomoditasModal
          modalState={modalState}
          onClose={() => {
            setModalState(null)
          }}
        />
      </main>
    </>
  )
}
