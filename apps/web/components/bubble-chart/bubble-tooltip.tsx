'use client'

import { useHistorisKomoditas } from '@/lib/hooks/use-historis-komoditas'
import { calculateTooltipPosition, TOOLTIP_WIDTH, TOOLTIP_HEIGHT } from '@/lib/tooltip-utils'
import type { BubbleData, HargaHarian } from '@pantau-pangan/shared'

interface BubbleTooltipProps {
  bubble: BubbleData | null
  x: number
  y: number
  provinsiId: number
}

/** Maps bubble color hex → CSS var signal (theme-aware: dark/light variants) */
function getColorVar(color: string): string {
  switch (color) {
    case '#ef4444':
    case '#f97316':
      return 'var(--signal-up)'
    case '#22c55e':
    case '#84cc16':
      return 'var(--signal-down)'
    default:
      return 'var(--signal-stable)'
  }
}

/** Arrow indicator based on perubahan value and color */
function getArrow(perubahan: number, color: string): string {
  if (color === '#6b7280') return ''
  if (perubahan > 0) return '↑'
  if (perubahan < 0) return '↓'
  return ''
}

/** Inline SVG sparkline from HargaHarian[] data */
function Sparkline({ data }: { data: HargaHarian[] }) {
  if (data.length < 2) return null

  const width = 120
  const height = 40
  const padding = 2

  const prices = data.map((d) => d.harga)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1 // avoid division by zero

  const points = data.map((d, i) => {
    const px = padding + (i / (data.length - 1)) * (width - padding * 2)
    const py = padding + (1 - (d.harga - minPrice) / priceRange) * (height - padding * 2)
    return `${px.toFixed(1)},${py.toFixed(1)}`
  })

  const polylinePoints = points.join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="mt-2"
    >
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="var(--signal-stable)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Inner component that fetches historis data and renders sparkline conditionally */
function TooltipContent({ bubble, provinsiId }: { bubble: BubbleData; provinsiId: number }) {
  const showSparkline = bubble.radius >= 50
  const { data: historisData, isError } = useHistorisKomoditas(
    showSparkline ? bubble.komoditasId : null,
    provinsiId,
  )

  const arrow = getArrow(bubble.perubahan, bubble.color)
  const colorVar = getColorVar(bubble.color)
  const formattedHarga = `Rp ${bubble.harga.toLocaleString('id-ID')}/kg`
  const formattedPerubahan = `${arrow}${Math.abs(bubble.perubahan).toFixed(1)}%`

  return (
    <>
      {/* Nama komoditas */}
      <p className="text-sm font-bold text-popover-foreground leading-tight">{bubble.nama}</p>

      {/* Harga */}
      <p className="text-sm text-muted-foreground mt-1">{formattedHarga}</p>

      {/* Persentase perubahan dengan arrow dan warna */}
      <p className="text-sm font-bold mt-0.5" style={{ color: colorVar }}>
        {formattedPerubahan}
      </p>

      {/* Satuan */}
      <p className="text-xs text-muted-foreground mt-0.5">per kg</p>

      {/* Sparkline — hanya jika radius >= 50 dan data tersedia dan tidak error */}
      {showSparkline && !isError && historisData && historisData.length >= 2 && (
        <Sparkline data={historisData} />
      )}
    </>
  )
}

export function BubbleTooltip({ bubble, x, y, provinsiId }: BubbleTooltipProps) {
  if (bubble === null) return null

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800

  const pos = calculateTooltipPosition(
    x,
    y,
    viewportWidth,
    viewportHeight,
    TOOLTIP_WIDTH,
    TOOLTIP_HEIGHT,
  )

  return (
    <div
      role="tooltip"
      className="absolute z-50 bg-popover backdrop-blur-md rounded-md shadow-[0_4px_30px_rgba(0,0,0,0.5)] border border-border p-4 pointer-events-none transition-opacity duration-150 opacity-100"
      style={{
        left: pos.x,
        top: pos.y,
        width: TOOLTIP_WIDTH,
        minHeight: TOOLTIP_HEIGHT,
      }}
    >
      <TooltipContent bubble={bubble} provinsiId={provinsiId} />
    </div>
  )
}
