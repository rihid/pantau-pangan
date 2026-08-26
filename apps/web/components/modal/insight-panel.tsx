'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useInsight } from '@/lib/hooks/use-insight'
import { formatTanggal } from '@/lib/modal-utils'
import { InsightPanelSkeleton } from './insight-panel-skeleton'
import { InsightContent } from './insight-content'

interface InsightPanelProps {
  komoditasId: number
  provinsiId: number
}

export function InsightPanel({ komoditasId, provinsiId }: InsightPanelProps) {
  const { data, isLoading, isError, refetch } = useInsight(komoditasId, provinsiId)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false)
      return
    }
    const timer = setTimeout(() => setTimedOut(true), 35_000)
    return () => clearTimeout(timer)
  }, [isLoading])

  if (isLoading && !timedOut) {
    return <InsightPanelSkeleton />
  }

  if (isError || timedOut) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">Insight tidak tersedia saat ini</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTimedOut(false)
            void refetch()
          }}
        >
          Coba lagi
        </Button>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div>
      <InsightContent markdown={data.insight} />
      {data.cached && (
        <p className="mt-3 text-xs text-muted-foreground">
          Dari cache ·{' '}
          <span className="font-mono">
            {formatTanggal(data.generatedAt.split('T')[0] ?? data.generatedAt)}
          </span>
        </p>
      )}
    </div>
  )
}
