'use client'

import { useMemo, useState } from 'react'
import type { BubbleData, Timeframe } from '@pantau-pangan/shared'
import { useKomoditas } from '@/lib/hooks/use-komoditas'
import { useDataRange } from '@/lib/hooks/use-data-range'
import { summarizeBubbles } from '@/lib/summary-utils'
import { TopBar } from '@/components/layout/top-bar'
import { RingkasanSidebar } from '@/components/sidebar/ringkasan-sidebar'
import { TimeframeFilter } from '@/components/filters/timeframe-filter'
import { SearchFilter } from '@/components/filters/search-filter'
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

  const summary = useMemo(() => summarizeBubbles(data ?? []), [data])

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

      <div className="grid grid-rows-[auto_1fr_auto] h-dvh overflow-hidden bg-page-gradient text-foreground">
        {/* Top bar */}
        <TopBar
          timeframe={timeframe}
          onTimeframeChange={handleTimeframeChange}
          disabledTimeframes={disabledTimeframes}
          availableDays={availableDays}
          provinsiId={provinsiId}
          onProvinsiChange={setProvinsiId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={handleRefresh}
          isRefetching={isRefetching}
          isLive={!isLoading && !isError}
        />

        {/* Middle row: sidebar (lg+) + bubble cluster */}
        <div className="grid lg:grid-cols-[300px_1fr] min-h-0">
          <RingkasanSidebar summary={summary} isLoading={isLoading} onSelect={handleBubbleClick} />

          <main
            id="main-content"
            tabIndex={-1}
            className="relative min-h-0 min-w-0 bg-cluster-focus"
          >
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

            {/* Mobile: floating timeframe dock + search */}
            <nav
              aria-label="Filter dan navigasi mobile"
              className="md:hidden absolute bottom-4 inset-x-0 z-10 flex flex-col items-center gap-2 pointer-events-none"
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
          </main>
        </div>

        {/* Footer — freshness strip */}
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
    </>
  )
}
