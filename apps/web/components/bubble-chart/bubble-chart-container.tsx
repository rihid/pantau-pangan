'use client'

import { useEffect, useRef, useState } from 'react'
import type { BubbleData } from '@pantau-pangan/shared'
import { BubbleChart } from './bubble-chart'
import { BubbleChartSkeleton } from './bubble-chart-skeleton'
import { BubbleChartError } from './bubble-chart-error'
import { BubbleTooltip } from './bubble-tooltip'

interface BubbleChartContainerProps {
  data: BubbleData[]
  isLoading: boolean
  isError: boolean
  isRefetching: boolean
  onRetry: () => void
  provinsiId: number
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
}: BubbleChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 })
  const [hoveredBubble, setHoveredBubble] = useState<HoveredBubble>({
    bubble: null,
    x: 0,
    y: 0,
  })

  // Track previous dimensions to apply the 50px threshold (Requirement 9.4)
  const prevDimensionsRef = useRef<Dimensions>({ width: 0, height: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return

      const { width, height } = entry.contentRect
      const prev = prevDimensionsRef.current

      // Only update (and restart simulation) if change > 50px — Requirement 9.4
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
    // flex-1 fills remaining viewport height after header + filter controls (Requirement 9.1)
    <div ref={containerRef} className="relative w-full h-full">
      {isLoading ? (
        // Initial loading — show skeleton (Requirement 8.1)
        <BubbleChartSkeleton />
      ) : isError ? (
        // Error state takes priority over refetching overlay (Requirement 8.3)
        <BubbleChartError onRetry={onRetry} />
      ) : (
        <>
          {/* BubbleChart with opacity-50 overlay when refetching (Requirement 8.2) */}
          <div className={isRefetching ? 'opacity-50' : undefined}>
            <BubbleChart
              data={data}
              width={dimensions.width}
              height={dimensions.height}
              onBubbleHover={handleBubbleHover}
            />
          </div>

          {/* BubbleTooltip rendered outside SVG as sibling div (Requirement 5.6) */}
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
