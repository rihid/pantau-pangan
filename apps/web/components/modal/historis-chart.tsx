'use client'

import * as d3 from 'd3'
import { useEffect, useRef, useState } from 'react'
import { computeHighLow, filterByTimeframe } from '@/lib/modal-utils'
import { useHistorisModal } from '@/lib/hooks/use-historis-modal'
import { HistorisChartSkeleton } from './historis-chart-skeleton'
import type { HargaHarian, Timeframe } from '@pantau-pangan/shared'

interface HistorisChartProps {
  komoditasId: number
  timeframe: Timeframe
  provinsiId: number
  namaKomoditas: string
}

const MARGIN = { top: 20, right: 40, bottom: 30, left: 60 }

/** Format angka ribuan dengan locale ID (titik sebagai separator) */
const formatRibuan = (value: number): string => Math.round(value).toLocaleString('id-ID')

export function HistorisChart({
  komoditasId,
  timeframe,
  provinsiId,
  namaKomoditas,
}: HistorisChartProps) {
  const { data, isLoading, isError, refetch } = useHistorisModal(komoditasId, timeframe, provinsiId)

  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 200,
  })

  // ResizeObserver untuk mendapatkan dimensi container yang responsif
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDimensions({ width, height })
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const filteredData: HargaHarian[] = data ? filterByTimeframe(data, timeframe) : []

  // D3 rendering
  useEffect(() => {
    const { width, height } = dimensions
    if (!svgRef.current || width === 0 || height === 0 || filteredData.length === 0) return

    const innerW = width - MARGIN.left - MARGIN.right
    const innerH = height - MARGIN.top - MARGIN.bottom

    if (innerW <= 0 || innerH <= 0) return

    const svg = d3.select(svgRef.current)

    // Inisialisasi struktur SVG hanya sekali
    let rootG = svg.select<SVGGElement>('g.chart-root')
    if (rootG.empty()) {
      rootG = svg
        .append('g')
        .attr('class', 'chart-root')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

      rootG.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${innerH})`)
      rootG.append('g').attr('class', 'y-axis')
      rootG
        .append('path')
        .attr('class', 'line-path')
        .attr('fill', 'none')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 2)
      rootG.append('g').attr('class', 'high-low-markers')
    }

    // Parse tanggal dari string YYYY-MM-DD
    const parsedData = filteredData
      .map((d) => ({ ...d, date: new Date(d.tanggal) }))
      .filter((d) => !isNaN(d.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    if (parsedData.length === 0) return

    // Skala X — scaleTime
    const xExtent = d3.extent(parsedData, (d) => d.date) as [Date, Date]
    const xScale = d3.scaleTime().domain(xExtent).range([0, innerW])

    // Skala Y — scaleLinear dengan padding 2%
    const prices = parsedData.map((d) => d.harga)
    const minPrice = d3.min(prices)!
    const maxPrice = d3.max(prices)!
    const yPad = (maxPrice - minPrice) * 0.02 || maxPrice * 0.02 || 1
    const yScale = d3
      .scaleLinear()
      .domain([minPrice - yPad, maxPrice + yPad])
      .range([innerH, 0])
      .nice()

    const transition = d3.transition().duration(300)

    // Update sumbu X
    const xAxis = d3.axisBottom(xScale).tickFormat((d) => d3.timeFormat('%d/%m')(d as Date))
    rootG
      .select<SVGGElement>('g.x-axis')
      .attr('transform', `translate(0,${innerH})`)
      .transition(transition)
      .call(xAxis)

    // Update sumbu Y
    const yAxis = d3.axisLeft(yScale).tickFormat((d) => formatRibuan(d as number))
    rootG.select<SVGGElement>('g.y-axis').transition(transition).call(yAxis)

    // Update garis chart
    const lineGen = d3
      .line<{ date: Date; harga: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.harga))
      .curve(d3.curveMonotoneX)

    rootG
      .select<SVGPathElement>('path.line-path')
      .datum(parsedData)
      .transition(transition)
      .attr('d', lineGen)

    // HighLowMarker — hanya jika data > 1 titik
    const markersG = rootG.select<SVGGElement>('g.high-low-markers')
    markersG.selectAll('*').remove()

    const highLow = computeHighLow(filteredData)
    if (highLow && filteredData.length > 1) {
      const markers = [
        { item: highLow.max, color: '#ef4444', label: `Rp ${formatRibuan(highLow.max.harga)}` },
        { item: highLow.min, color: '#22c55e', label: `Rp ${formatRibuan(highLow.min.harga)}` },
      ]

      for (const marker of markers) {
        const itemDate = new Date(marker.item.tanggal)
        const cx = xScale(itemDate)
        const cy = yScale(marker.item.harga)

        markersG
          .append('circle')
          .attr('data-marker', 'true')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 5)
          .attr('fill', marker.color)
          .attr('stroke', 'white')
          .attr('stroke-width', 1.5)

        // Label di samping marker; geser ke kiri jika terlalu ke kanan
        const labelX = cx + 8 > innerW - 60 ? cx - 8 : cx + 8
        const textAnchor = cx + 8 > innerW - 60 ? 'end' : 'start'

        markersG
          .append('text')
          .attr('x', labelX)
          .attr('y', cy + 4)
          .attr('text-anchor', textAnchor)
          .attr('font-size', 11)
          .attr('fill', marker.color)
          .text(marker.label)
      }
    }
  }, [filteredData, dimensions])

  // --- Render states ---

  if (isLoading) {
    return <HistorisChartSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-[200px] text-sm text-muted-foreground">
        <span>Gagal memuat data historis.</span>
        <button
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

  return (
    <div ref={containerRef} className="w-full" style={{ height: 200 }}>
      <svg
        ref={svgRef}
        role="img"
        aria-label={`Line chart harga ${namaKomoditas} — ${filteredData.length} hari terakhir`}
        width={dimensions.width}
        height={dimensions.height}
        className="block overflow-visible"
      />
    </div>
  )
}
