'use client'

import { useEffect, useRef, useState } from 'react'
import type { BubbleData } from '@pantau-pangan/shared'
import { BubbleChart } from './bubble-chart'
import { BubbleChartSkeleton } from './bubble-chart-skeleton'
import { BubbleChartError } from './bubble-chart-error'
import { BubbleTooltip } from './bubble-tooltip'
import { useSparklines } from '@/lib/hooks/use-sparklines'

interface BubbleChartContainerProps {
  data: BubbleData[]
  isLoading: boolean
  isError: boolean
  isRefetching: boolean
  onRetry: () => void
  provinsiId: number
  searchQuery?: string
}

interface Dimensions {
  width: number
  height: number
}

interface HoveredBubble {
  bubble: BubbleData | null
  x: number
  y: number
}

export function BubbleChartContainer({
  data,
  isLoading,
  isError,
  isRefetching,
  onRetry,
  provinsiId,
  searchQuery,
}: BubbleChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 })
  const [hoveredBubble, setHoveredBubble] = useState<HoveredBubble>({
    bubble: null,
    x: 0,
    y: 0,
  })

  const prevDimensionsRef = useRef<Dimensions>({ width: 0, height: 0 })

  // Fetch sparkline data for large bubbles
  const sparklines = useSparklines(data, provinsiId)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return

      const { width, height } = entry.contentRect
      const prev = prevDimensionsRef.current

      // Only update (and restart simulation) if change > 50px
      if (Math.abs(width - prev.width) > 50 || Math.abs(height - prev.height) > 50) {
        prevDimensionsRef.current = { width, height }
        setDimensions({ width, height })
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const handleBubbleHover = (bubble: BubbleData | null, x: number, y: number) => {
    setHoveredBubble({ bubble, x, y })
  }

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {isLoading ? (
        <BubbleChartSkeleton />
      ) : isError ? (
        <BubbleChartError onRetry={onRetry} />
      ) : (
        <>
          <div className={isRefetching ? 'opacity-50' : undefined}>
            <BubbleChart
              data={data}
              width={dimensions.width}
              height={dimensions.height}
              sparklines={sparklines}
              searchQuery={searchQuery}
              onBubbleHover={handleBubbleHover}
            />
          </div>

          <BubbleTooltip
            bubble={hoveredBubble.bubble}
            x={hoveredBubble.x}
            y={hoveredBubble.y}
            provinsiId={provinsiId}
          />
        </>
      )}
    </div>
  )
}
