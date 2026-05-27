'use client'

import { useState } from 'react'
import type { Timeframe } from '@pantau-pangan/shared'
import { useKomoditas } from '@/lib/hooks/use-komoditas'
import { TimeframeFilter } from '@/components/filters/timeframe-filter'
import { ProvinsiFilter } from '@/components/filters/provinsi-filter'
import { BubbleChartContainer } from '@/components/bubble-chart/bubble-chart-container'
import { DataFooter } from '@/components/data-footer'

export default function HomePage() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D')
  const [provinsiId, setProvinsiId] = useState<number>(0)

  const { data, isLoading, isError, isRefetching, refetch } = useKomoditas(timeframe, provinsiId)

  return (
    <main className="flex flex-col h-full">
      {/* Header */}
      <header className="px-4 py-3 border-b border-border bg-background">
        <h1 className="text-lg font-semibold tracking-tight">Pantau Pangan</h1>
      </header>

      {/* Filter controls — vertical on mobile, horizontal on desktop */}
      <div className="flex flex-col md:flex-row gap-2 px-4 py-2">
        <TimeframeFilter value={timeframe} onChange={setTimeframe} />
        <ProvinsiFilter value={provinsiId} onChange={setProvinsiId} />
      </div>

      {/* Bubble chart container — fills remaining height */}
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

      {/* Footer — always rendered, even during initial loading */}
      <DataFooter />
    </main>
  )
}
