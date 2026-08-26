'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { filterByTimeframe, formatHargaRp } from '@/lib/modal-utils'
import { useHistorisModal } from '@/lib/hooks/use-historis-modal'
import { HistorisChartSkeleton } from './historis-chart-skeleton'
import type { HargaHarian, Timeframe } from '@pantau-pangan/shared'

interface HistorisChartProps {
  komoditasId: number
  timeframe: Timeframe
  provinsiId: number
  namaKomoditas: string
}

function formatTickDate(tanggal: string): string {
  return `${tanggal.slice(8, 10)}/${tanggal.slice(5, 7)}`
}

function formatTooltipDate(tanggal: string): string {
  const [year, month, day] = tanggal.split('-')
  return `${day}/${month}/${year}`
}

function formatYAxis(value: number): string {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`
}

/**
 * True di layar >= sm (640px) — dipakai untuk menampilkan label harga di kanan
 * dan semua tick tanggal hanya di layar lebar, versi ringkas di mobile.
 */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(min-width: 640px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isDesktop
}

interface ChartDataPoint {
  tanggal: string
  harga: number
}

// Tren chart historis pakai konvensi pasar finansial (naik=hijau, turun=merah),
// sengaja BERBEDA dari konvensi bubble (merah=naik) — permintaan eksplisit user.
const TREND_UP = 'var(--signal-down)'
const TREND_DOWN = 'var(--signal-up-strong)'
const TREND_FLAT = 'var(--foreground)'

function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  const price = payload[0]?.value
  return (
    <div className="rounded-md border border-border bg-popover text-popover-foreground px-3 py-2 shadow-sm text-sm">
      <div className="text-muted-foreground mb-1 text-xs">
        {typeof label === 'string' ? formatTooltipDate(label) : ''}
      </div>
      <div className="font-mono font-medium">
        {typeof price === 'number' ? formatHargaRp(price) : '—'}
      </div>
    </div>
  )
}

export function HistorisChart({
  komoditasId,
  timeframe,
  provinsiId,
  namaKomoditas,
}: HistorisChartProps) {
  const { data, isLoading, isError, refetch } = useHistorisModal(komoditasId, timeframe, provinsiId)
  const [mounted, setMounted] = useState(false)
  const isDesktop = useIsDesktop()

  useEffect(() => {
    setMounted(true)
  }, [])

  const filteredData: HargaHarian[] = data ? filterByTimeframe(data, timeframe) : []

  const chartData: ChartDataPoint[] = useMemo(() => {
    return filteredData
      .slice()
      .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
      .map((d) => ({ tanggal: d.tanggal, harga: d.harga }))
  }, [filteredData])

  const tickDates = useMemo(() => {
    if (chartData.length <= 3) return chartData.map((d) => d.tanggal)
    const first = chartData[0]?.tanggal
    const middle = chartData[Math.floor(chartData.length / 2)]?.tanggal
    const last = chartData[chartData.length - 1]?.tanggal
    return [first, middle, last].filter((t): t is string => t !== undefined)
  }, [chartData])

  const latestPrice = chartData.length > 0 ? chartData[chartData.length - 1]?.harga : undefined

  const firstPrice = chartData.length > 0 ? chartData[0]?.harga : undefined
  const trend = firstPrice !== undefined && latestPrice !== undefined ? latestPrice - firstPrice : 0
  const trendColor = trend > 0 ? TREND_UP : trend < 0 ? TREND_DOWN : TREND_FLAT

  // --- Render states ---

  if (isLoading) {
    return <HistorisChartSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-[200px] text-sm text-muted-foreground">
        <span>Gagal memuat data historis.</span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-medium transition-colors"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  if (!isLoading && data !== undefined && filteredData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        Data historis belum tersedia
      </div>
    )
  }

  if (!mounted) {
    return <div className="h-[300px]" />
  }

  return (
    <div
      className="w-full h-[200px] sm:h-[300px]"
      role="img"
      aria-label={`Line chart harga ${namaKomoditas} — ${chartData.length} hari terakhir`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="historisGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={trendColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="tanggal"
            ticks={isDesktop ? undefined : tickDates}
            tickFormatter={formatTickDate}
            tick={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fill: 'var(--muted-foreground)',
            }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={{ stroke: 'var(--border)' }}
          />
          {/* Label harga di kanan hanya di layar lebar — mobile chart full ke kanan */}
          {isDesktop && (
            <YAxis
              orientation="right"
              tickFormatter={formatYAxis}
              tick={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fill: 'var(--muted-foreground)',
              }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
              width={80}
            />
          )}
          <Tooltip content={CustomTooltip} />
          {typeof latestPrice === 'number' && (
            <ReferenceLine
              y={latestPrice}
              stroke={trendColor}
              strokeDasharray="4 4"
              label={
                isDesktop
                  ? {
                      value: formatHargaRp(latestPrice),
                      position: 'right',
                      fill: trendColor,
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                    }
                  : undefined
              }
            />
          )}
          <Area
            type="monotone"
            dataKey="harga"
            stroke={trendColor}
            strokeWidth={2}
            fill="url(#historisGradient)"
            dot={false}
            activeDot={{
              r: 4,
              fill: trendColor,
              stroke: 'var(--background)',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
