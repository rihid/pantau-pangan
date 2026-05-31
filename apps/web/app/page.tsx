'use client'

import { useState } from 'react'
import type { Timeframe } from '@pantau-pangan/shared'
import { useKomoditas } from '@/lib/hooks/use-komoditas'
import { useDataRange } from '@/lib/hooks/use-data-range'
import { TimeframeFilter } from '@/components/filters/timeframe-filter'
import { ProvinsiFilter } from '@/components/filters/provinsi-filter'
import { BubbleChartContainer } from '@/components/bubble-chart/bubble-chart-container'
import { DataFooter } from '@/components/data-footer'

export default function HomePage() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D')
  const [provinsiId, setProvinsiId] = useState<number>(0)

  const { data, isLoading, isError, isRefetching, refetch } = useKomoditas(timeframe, provinsiId)
  const { disabledTimeframes, availableDays } = useDataRange(provinsiId)

  // Jika timeframe aktif tiba-tiba jadi disabled (misal ganti provinsi),
  // fallback ke timeframe terpendek yang tersedia
  const handleTimeframeChange = (tf: Timeframe) => {
    if (!disabledTimeframes.has(tf)) setTimeframe(tf)
  }

  return (
    <>
      <main className="flex flex-col h-dvh overflow-hidden bg-background">
        {/* Header */}
        <header className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border">
          <h1 className="text-base font-semibold tracking-tight">Pantau Pangan</h1>
        </header>

        {/* Filter controls */}
        <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border">
          <TimeframeFilter
            value={timeframe}
            onChange={handleTimeframeChange}
            disabledTimeframes={disabledTimeframes}
            availableDays={availableDays}
          />
          <div className="ml-auto">
            <ProvinsiFilter value={provinsiId} onChange={setProvinsiId} />
          </div>
        </div>

        {/* Bubble chart */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <BubbleChartContainer
            data={data ?? []}
            isLoading={isLoading}
            isError={isError}
            isRefetching={isRefetching}
            onRetry={() => {
              void refetch()
            }}
            provinsiId={provinsiId}
          />
        </div>
      </main>

      <DataFooter />
    </>
  )
}
