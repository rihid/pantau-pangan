'use client'

import { useState, useEffect } from 'react'
import type { BiDetailGridRow } from '@pantau-pangan/shared'
import { parseDateColumns, formatHarga, sortByDateColumn } from '@/lib/modal-utils'
import { useDetailGeografis } from '@/lib/hooks/use-detail-geografis'
import { GeografisTableSkeleton } from './geografis-table-skeleton'

interface GeografisTableProps {
  komoditasId: number
  provinsiId: number
}

/**
 * Traverse the flat BiDetailGridRow[] and return only rows whose parent is
 * in expandedNodes. Level hierarchy: 0=Nasional, 1=Provinsi, 2=Kota, 3=Pasar.
 *
 * The array is ordered such that each row's parent is the most recent ancestor
 * with level = currentLevel - 1. We track the "current parent" per level as we
 * walk through the list.
 */
function getVisibleRows(allRows: BiDetailGridRow[], expandedNodes: Set<number>): BiDetailGridRow[] {
  const visible: BiDetailGridRow[] = []
  // Track the most recent ancestor id for each level
  const parentAtLevel: Record<number, number> = {}

  for (const row of allRows) {
    const level = typeof row.level === 'number' ? row.level : 0
    const id = typeof row.id === 'number' ? row.id : 0

    if (level === 0) {
      // Nasional is always visible (root)
      visible.push(row)
      parentAtLevel[0] = id
    } else {
      // A row is visible if its parent level is expanded
      const parentLevel = level - 1
      const parentId = parentAtLevel[parentLevel]
      if (parentId !== undefined && expandedNodes.has(parentId)) {
        visible.push(row)
        // This row becomes the current ancestor at its level
        parentAtLevel[level] = id
      } else {
        // Row is hidden — also update parentAtLevel so deeper children
        // don't accidentally inherit a stale parent
        parentAtLevel[level] = id
      }
    }
  }

  return visible
}

export function GeografisTable({ komoditasId, provinsiId }: GeografisTableProps) {
  const { data, isLoading, isError, refetch } = useDetailGeografis(komoditasId, provinsiId)

  const rows: BiDetailGridRow[] = data?.data ?? []

  // Expand Nasional (level 0) by default when data first arrives
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set())
  const [initialised, setInitialised] = useState(false)

  useEffect(() => {
    if (rows.length > 0 && !initialised) {
      const nasional = rows.find((r) => r.level === 0)
      if (nasional && typeof nasional.id === 'number') {
        setExpandedNodes(new Set([nasional.id]))
      }
      setInitialised(true)
    }
  }, [rows, initialised])

  const [sortState, setSortState] = useState<{ column: string | null; direction: 'asc' | 'desc' }>({
    column: null,
    direction: 'desc',
  })

  function toggleNode(id: number) {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleHeaderClick(dateKey: string) {
    setSortState((prev) => {
      if (prev.column === dateKey) {
        return { column: dateKey, direction: prev.direction === 'desc' ? 'asc' : 'desc' }
      }
      return { column: dateKey, direction: 'desc' }
    })
  }

  if (isLoading) {
    return <GeografisTableSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
        <p>Gagal memuat data geografis.</p>
        <button
          onClick={() => void refetch()}
          className="px-4 py-2 text-sm font-medium rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Data geografis belum tersedia.
      </div>
    )
  }

  // Parse date columns from the first row (Nasional)
  const dateColumns = parseDateColumns(rows[0]!)

  // Apply sort if a column is selected, otherwise preserve API order
  const sortedRows =
    sortState.column !== null ? sortByDateColumn(rows, sortState.column, sortState.direction) : rows

  const visibleRows = getVisibleRows(sortedRows, expandedNodes)

  const indentClasses: Record<number, string> = {
    0: 'pl-0',
    1: 'pl-4',
    2: 'pl-8',
    3: 'pl-12',
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            {/* Wilayah column — scope="row" per design/a11y requirement */}
            <th
              scope="row"
              className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
            >
              Wilayah
            </th>
            {dateColumns.map((dateKey) => {
              const isActive = sortState.column === dateKey
              const arrow = isActive ? (sortState.direction === 'desc' ? ' ↓' : ' ↑') : ''
              return (
                <th
                  key={dateKey}
                  scope="col"
                  className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap"
                >
                  <button
                    onClick={() => handleHeaderClick(dateKey)}
                    className={`inline-flex items-center gap-1 hover:text-foreground transition-colors${isActive ? ' text-foreground' : ''}`}
                    aria-label={`Urutkan berdasarkan ${dateKey}${isActive ? (sortState.direction === 'desc' ? ', descending' : ', ascending') : ''}`}
                  >
                    {dateKey}
                    {arrow}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => {
            const level = typeof row.level === 'number' ? row.level : 0
            const id = typeof row.id === 'number' ? row.id : 0
            const name = typeof row.name === 'string' ? row.name : String(row.name)
            const isExpandable = level < 3
            const isExpanded = expandedNodes.has(id)
            const indent = indentClasses[level] ?? 'pl-0'

            return (
              <tr key={`${id}-${level}`} className="border-b border-border hover:bg-muted/30">
                <td className={`px-3 py-2 whitespace-nowrap ${indent}`}>
                  <span className="inline-flex items-center gap-1">
                    {isExpandable ? (
                      <button
                        onClick={() => toggleNode(id)}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Tutup' : 'Buka'} ${name}`}
                        className="inline-flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    ) : (
                      // Pasar (level 3): no toggle, just spacer for alignment
                      <span className="inline-block w-4 shrink-0" aria-hidden="true" />
                    )}
                    <span>{name}</span>
                  </span>
                </td>
                {dateColumns.map((dateKey) => {
                  const value = row[dateKey]
                  const formatted = formatHarga(typeof value === 'number' ? value : null)
                  return (
                    <td
                      key={dateKey}
                      className="px-3 py-2 text-right tabular-nums whitespace-nowrap"
                    >
                      {formatted}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
