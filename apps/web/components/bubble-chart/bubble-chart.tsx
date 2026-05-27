'use client'

import * as d3 from 'd3'
import { useEffect, useRef } from 'react'
import { clampBubblePosition } from '@/lib/bubble-utils'
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
  onBubbleHover: (bubble: BubbleData | null, x: number, y: number) => void
}

export function BubbleChart({
  data,
  isRefetching = false,
  width,
  height,
  onBubbleHover,
}: BubbleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<SimulationNode, undefined> | null>(null)
  // Preserve positions across data updates keyed by komoditasId
  const prevNodesRef = useRef<Map<number, { x: number; y: number }>>(new Map())

  useEffect(() => {
    if (!svgRef.current || width === 0 || height === 0) return

    // Stop any existing simulation before creating a new one
    if (simulationRef.current) {
      simulationRef.current.stop()
    }

    // Build SimulationNode[] from BubbleData[], preserving previous positions
    const nodes: SimulationNode[] = data.map((d) => {
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

    // Setup force simulation
    const simulation = d3
      .forceSimulation<SimulationNode>(nodes)
      .force('center', d3.forceCenter(width / 2, height / 2))
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
          el.attr('x', node.x).attr('y', node.y)
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
  }, [data, width, height])

  const ariaLabel = `Bubble chart harga pangan — ${data.length} komoditas`

  return (
    <div className={isRefetching ? 'opacity-50' : undefined}>
      <svg ref={svgRef} role="img" aria-label={ariaLabel} width={width} height={height}>
        {data.map((d) => {
          const circleAriaLabel = `${d.nama}: Rp ${d.harga.toLocaleString('id-ID')}/kg, ${
            d.perubahan > 0 ? 'naik' : 'turun'
          } ${Math.abs(d.perubahan).toFixed(1)}%`

          // Arrow indicator: omit for stable color (#6b7280)
          const isStable = d.color === '#6b7280'
          const arrow = isStable ? '' : d.perubahan > 0 ? '↑' : d.perubahan < 0 ? '↓' : ''
          const pct = `${Math.abs(d.perubahan).toFixed(1)}%`
          const shortName = d.nama.length > 10 ? d.nama.substring(0, 10) : d.nama
          const labelText = arrow ? `${shortName} ${arrow}${pct}` : `${shortName} ${pct}`

          return (
            <g key={d.komoditasId}>
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
              />
              {d.radius >= 40 && (
                <text
                  data-text-id={d.komoditasId}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.max(10, Math.min(13, d.radius * 0.22))}
                  fill="white"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {labelText}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
