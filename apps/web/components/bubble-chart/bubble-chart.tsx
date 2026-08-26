'use client'

import * as d3 from 'd3'
import { useEffect, useMemo, useRef } from 'react'
import { clampBubblePosition, computeBubbleScale } from '@/lib/bubble-utils'
import { buildSparklinePoints } from '@pantau-pangan/shared'
import type { BubbleData } from '@pantau-pangan/shared'

interface SimulationNode extends BubbleData {
  x: number
  y: number
  vx: number
  vy: number
  fx: number | null
  fy: number | null
}

interface BubbleChartProps {
  data: BubbleData[]
  isRefetching?: boolean
  width: number
  height: number
  /** Map komoditasId → prices untuk sparkline (radius >= 50px) */
  sparklines?: Map<number, number[]>
  /** Highlight bubbles yang namanya cocok dengan query ini */
  searchQuery?: string
  onBubbleHover: (bubble: BubbleData | null, x: number, y: number) => void
  /** Optional click handler — opens detail modal */
  onBubbleClick?: (bubble: BubbleData) => void
}

/**
 * Salin BubbleData dengan radius yang di-scale terhadap ukuran canvas supaya
 * total luas bubble mengisi canvas tanpa overlap. Dipakai konsisten oleh
 * simulation (collision + clamp) maupun rendering (circle r, label, sparkline).
 */
function scaleBubbleData(data: BubbleData[], width: number, height: number): BubbleData[] {
  const scale = computeBubbleScale(data, width, height)
  if (scale === 1) return data
  return data.map((d) => ({ ...d, radius: d.radius * scale }))
}

export function BubbleChart({
  data,
  isRefetching = false,
  width,
  height,
  sparklines,
  searchQuery,
  onBubbleHover,
  onBubbleClick,
}: BubbleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<SimulationNode, undefined> | null>(null)
  // Preserve positions across data updates keyed by komoditasId
  const prevNodesRef = useRef<Map<number, { x: number; y: number }>>(new Map())

  // Bubble radius yang sudah di-scale terhadap ukuran canvas, supaya tidak
  // tumpang tindih di layar kecil. Dipakai konsisten oleh simulation & render.
  const scaledData = useMemo(() => scaleBubbleData(data, width, height), [data, width, height])

  useEffect(() => {
    if (!svgRef.current || width === 0 || height === 0) return

    // Stop any existing simulation before creating a new one
    if (simulationRef.current) {
      simulationRef.current.stop()
    }

    // Build SimulationNode[] from BubbleData[], preserving previous positions
    const nodes: SimulationNode[] = scaledData.map((d) => {
      const prev = prevNodesRef.current.get(d.komoditasId)
      return {
        ...d,
        x: prev?.x ?? width / 2 + (Math.random() - 0.5) * 100,
        y: prev?.y ?? height / 2 + (Math.random() - 0.5) * 100,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      }
    })

    const svg = d3.select(svgRef.current)

    // Bubble bergerak bebas: hanya collide (anti-overlap) + charge (repulsi)
    // supaya menyebar mengisi canvas. Tanpa forceCenter/forceX/forceY agar
    // tidak terkonsentrasi di tengah — ukuran bubble sudah di-scale agar
    // total luasnya muat di canvas, jadi tidak butuh penarikan ke tengah.
    const simulation = d3
      .forceSimulation<SimulationNode>(nodes)
      .force(
        'collide',
        d3.forceCollide<SimulationNode>((d) => d.radius + 2),
      )
      .force('charge', d3.forceManyBody<SimulationNode>().strength(-30))

    simulationRef.current = simulation

    // On each tick: clamp positions and update DOM directly (no React state)
    simulation.on('tick', () => {
      nodes.forEach((d) => {
        const clamped = clampBubblePosition(d.x, d.y, d.radius, width, height)
        d.x = clamped.x
        d.y = clamped.y
      })

      // Update circle positions by matching data-id to node
      const nodeMap = new Map(nodes.map((n) => [String(n.komoditasId), n]))

      svg.selectAll<SVGCircleElement, unknown>('circle[data-id]').each(function () {
        const el = d3.select(this)
        const id = el.attr('data-id')
        const node = nodeMap.get(id)
        if (node) {
          el.attr('cx', node.x).attr('cy', node.y)
        }
      })

      svg.selectAll<SVGTextElement, unknown>('text[data-text-id]').each(function () {
        const el = d3.select(this)
        const id = el.attr('data-text-id')
        const node = nodeMap.get(id)
        if (node) {
          const offset = parseFloat(el.attr('data-offset') ?? '0')
          el.attr('x', node.x).attr('y', node.y + offset)
        }
      })

      // Update sparkline polyline positions
      svg.selectAll<SVGPolylineElement, unknown>('polyline[data-sparkline-id]').each(function () {
        const el = d3.select(this)
        const id = el.attr('data-sparkline-id')
        const node = nodeMap.get(id)
        if (node) {
          const offset = parseFloat(el.attr('data-sparkline-offset') ?? '0')
          el.attr('transform', `translate(${node.x - SPARKLINE_W / 2},${node.y + offset})`)
        }
      })
    })

    // When simulation ends, save positions for next update
    simulation.on('end', () => {
      const newMap = new Map<number, { x: number; y: number }>()
      nodes.forEach((d) => {
        newMap.set(d.komoditasId, { x: d.x, y: d.y })
      })
      prevNodesRef.current = newMap
    })

    return () => {
      // Save current positions before cleanup so next render can preserve them
      const newMap = new Map<number, { x: number; y: number }>()
      nodes.forEach((d) => {
        newMap.set(d.komoditasId, { x: d.x, y: d.y })
      })
      prevNodesRef.current = newMap
      simulation.stop()
    }
  }, [scaledData, width, height])

  const ariaLabel = `Bubble chart harga pangan — ${scaledData.length} komoditas`

  // Normalise search query for case-insensitive match
  const query = searchQuery?.trim().toLowerCase() ?? ''
  const hasQuery = query.length > 0
  const isMobile = width < MOBILE_BREAKPOINT

  return (
    <div className={`w-full h-full${isRefetching ? ' opacity-50' : ''}`}>
      <svg
        ref={svgRef}
        role="img"
        aria-label={ariaLabel}
        width={width}
        height={height}
        className="block"
      >
        {scaledData.map((d) => {
          const circleAriaLabel = `${d.nama}: Rp ${d.harga.toLocaleString('id-ID')}/kg, ${
            d.perubahan > 0 ? 'naik' : 'turun'
          } ${Math.abs(d.perubahan).toFixed(1)}%`

          // Arrow indicator: omit for stable color (#6b7280)
          const isStable = d.color === '#6b7280'
          const arrow = isStable ? '' : d.perubahan > 0 ? '↑' : d.perubahan < 0 ? '↓' : ''
          const pct = arrow
            ? `${arrow}${Math.abs(d.perubahan).toFixed(1)}%`
            : `${Math.abs(d.perubahan).toFixed(1)}%`

          // Search highlight: dim non-matching bubbles
          const isMatch = hasQuery ? d.nama.toLowerCase().includes(query) : true

          // Font sizes scale with radius — mobile pakai rasio lebih besar & cap lebih kecil
          const nameFontSize = isMobile
            ? Math.max(8, Math.min(18, d.radius * 0.3))
            : Math.max(10, Math.min(22, d.radius * 0.28))
          const pctFontSize = isMobile
            ? Math.max(7, Math.min(13, d.radius * 0.22))
            : Math.max(8, Math.min(16, d.radius * 0.2))

          // Split name into up to 2 lines based on available bubble width
          // Approx char width = 0.55 * fontSize for mixed-case text
          const charWidth = nameFontSize * 0.55
          const maxWidth = d.radius * 1.7 // usable chord width
          const maxCharsPerLine = Math.max(3, Math.floor(maxWidth / charWidth))

          let nameLine1 = d.nama
          let nameLine2: string | null = null

          if (d.nama.length > maxCharsPerLine) {
            const slice = d.nama.substring(0, maxCharsPerLine)
            const lastSpace = slice.lastIndexOf(' ')
            const splitAt = lastSpace > 0 ? lastSpace : maxCharsPerLine

            nameLine1 = d.nama.substring(0, splitAt).trim()
            const rest = d.nama.substring(splitAt).trim()

            if (rest.length > maxCharsPerLine) {
              nameLine2 = rest.substring(0, maxCharsPerLine - 1) + '…'
            } else {
              nameLine2 = rest
            }
          }

          const isTwoLines = nameLine2 !== null
          const lineHeight = nameFontSize * 1.15
          const gap = pctFontSize * 0.9

          // Sparkline hanya di layar lebar — mobile dihilangkan (bubble terlalu kecil)
          const hasSparkline =
            !isMobile && d.radius >= 50 && (sparklines?.has(d.komoditasId) ?? false)

          const nameBlockHeight = isTwoLines ? lineHeight + nameFontSize : nameFontSize
          const totalHeight = nameBlockHeight + gap + pctFontSize
          // Grup teks + sparkline di-center bersama, supaya teks pct tidak menabrak sparkline
          const blockTop = hasSparkline ? -(totalHeight + gap + SPARKLINE_H) / 2 : -totalHeight / 2

          const line1Y = blockTop + nameFontSize / 2
          const line2Y = isTwoLines ? line1Y + lineHeight : null
          const pctY = blockTop + nameBlockHeight + gap + pctFontSize / 2

          // Sparkline: tepat di bawah teks pct, dengan jarak gap
          const sparklineTop = hasSparkline ? blockTop + totalHeight + gap : 0

          // Sparkline: positioned below the text block
          const sparklinePoints =
            hasSparkline && sparklines
              ? buildSparklinePoints(sparklines.get(d.komoditasId) ?? [], SPARKLINE_W, SPARKLINE_H)
              : ''

          return (
            <g
              key={d.komoditasId}
              style={{
                opacity: hasQuery ? (isMatch ? 1 : 0.2) : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <circle
                data-id={d.komoditasId}
                r={d.radius}
                fill={d.color}
                aria-label={circleAriaLabel}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  const rect = svgRef.current?.getBoundingClientRect()
                  const x = rect ? e.clientX - rect.left : e.clientX
                  const y = rect ? e.clientY - rect.top : e.clientY
                  onBubbleHover(d, x, y)
                }}
                onMouseLeave={() => {
                  onBubbleHover(null, 0, 0)
                }}
                onClick={() => onBubbleClick?.(d)}
              />

              {/* Search highlight ring */}
              {hasQuery && isMatch && (
                <circle
                  data-id={d.komoditasId}
                  r={d.radius + 3}
                  fill="none"
                  stroke="var(--bubble-label)"
                  strokeWidth={2}
                  strokeOpacity={0.6}
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {d.radius >= (isMobile ? MOBILE_LABEL_MIN_RADIUS : 40) && (
                <>
                  {/* Name line 1 */}
                  <text
                    data-text-id={d.komoditasId}
                    data-offset={line1Y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={nameFontSize}
                    fontWeight="500"
                    fill="var(--bubble-label)"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {nameLine1}
                  </text>
                  {/* Name line 2 (if needed) */}
                  {isTwoLines && line2Y !== null && (
                    <text
                      data-text-id={d.komoditasId}
                      data-offset={line2Y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={nameFontSize}
                      fontWeight="500"
                      fill="var(--bubble-label)"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {nameLine2}
                    </text>
                  )}
                  {/* Percentage — smaller, below name block */}
                  <text
                    data-text-id={d.komoditasId}
                    data-offset={pctY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={pctFontSize}
                    fontWeight="400"
                    fill="var(--bubble-label)"
                    opacity={0.9}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {pct}
                  </text>

                  {/* Sparkline — only for radius >= 50 and data available */}
                  {hasSparkline && sparklinePoints && (
                    <polyline
                      data-sparkline-id={d.komoditasId}
                      data-sparkline-offset={sparklineTop}
                      points={sparklinePoints}
                      fill="none"
                      stroke="var(--bubble-label)"
                      strokeOpacity={0.6}
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                </>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// Sparkline dimensions (constant, used in tick handler too)
const SPARKLINE_W = 60
const SPARKLINE_H = 20
// Canvas width di bawah ini dianggap mobile — sparkline dihilangkan, font lebih
// kecil, dan label muncul di bubble yang lebih kecil (MOBILE_LABEL_MIN_RADIUS).
const MOBILE_BREAKPOINT = 640
const MOBILE_LABEL_MIN_RADIUS = 24
