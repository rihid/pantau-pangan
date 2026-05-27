'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TIMEFRAME_DAYS } from '@pantau-pangan/shared'
import type { Timeframe } from '@pantau-pangan/shared'

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']

interface TimeframeFilterProps {
  value: Timeframe
  onChange: (tf: Timeframe) => void
  dataBadge?: Record<Timeframe, number | null>
}

export function TimeframeFilter({ value, onChange, dataBadge }: TimeframeFilterProps) {
  return (
    <div className="flex gap-1">
      {TIMEFRAMES.map((tf) => {
        const isActive = value === tf
        const showBadge =
          isActive &&
          dataBadge !== undefined &&
          dataBadge[tf] !== null &&
          (dataBadge[tf] ?? 0) < TIMEFRAME_DAYS[tf]

        return (
          <Button
            key={tf}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(tf)}
            className="relative"
          >
            {tf}
            {showBadge && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {`${tf} · ${dataBadge[tf]}d`}
              </Badge>
            )}
          </Button>
        )
      })}
    </div>
  )
}
