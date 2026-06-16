'use client'

import { useState } from 'react'
import type { Timeframe } from '@pantau-pangan/shared'
import { useKomoditas } from '@/lib/hooks/use-komoditas'
import { useDataRange } from '@/lib/hooks/use-data-range'
import { TimeframeFilter } from '@/components/filters/timeframe-filter'
import { ProvinsiFilter } from '@/components/filters/provinsi-filter'
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

  const { data, isLoading, isError, isRefetching, refetch } = useKomoditas(timeframe, provinsiId)
  const { disabledTimeframes, availableDays } = useDataRange(provinsiId)

  // Jika timeframe aktif tiba-tiba jadi disabled (misal ganti provinsi),
  // fallback ke timeframe terpendek yang tersedia
  const handleTimeframeChange = (tf: Timeframe) => {
    if (!disabledTimeframes.has(tf)) setTimeframe(tf)
  }

  return (
    <main className="flex flex-col h-dvh overflow-hidden bg-gradient-to-b from-zinc-950 via-slate-950 to-black text-foreground relative">
      {/* Floating Header */}
      <header className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-4 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-black font-bold text-lg shadow-[0_0_15px_rgba(34,197,94,0.5)]">
            P
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">
            PANTAU PANGAN
          </h1>
        </div>

        {/* Desktop Timeframe */}
        <div className="hidden md:flex pointer-events-auto">
          <TimeframeFilter
            value={timeframe}
            onChange={handleTimeframeChange}
            disabledTimeframes={disabledTimeframes}
            availableDays={availableDays}
          />
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          <ProvinsiFilter value={provinsiId} onChange={setProvinsiId} />
        </div>
      </header>

      {/* Bubble chart canvas */}
      <div className="flex-1 w-full h-full min-h-0 pt-16 pb-20 md:pb-0">
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

      {/* Mobile Floating Timeframe Dock */}
      <div className="md:hidden absolute bottom-6 inset-x-0 z-10 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <TimeframeFilter
            value={timeframe}
            onChange={handleTimeframeChange}
            disabledTimeframes={disabledTimeframes}
            availableDays={availableDays}
          />
        </div>
      </div>
    </main>
  )
}
