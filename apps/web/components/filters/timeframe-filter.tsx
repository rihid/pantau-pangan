'use client'

import { TIMEFRAME_DAYS } from '@pantau-pangan/shared'
import type { Timeframe } from '@pantau-pangan/shared'

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']

/** Label tooltip untuk timeframe yang disabled */
const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  '1D': '1 hari',
  '1W': '1 minggu',
  '1M': '1 bulan',
  '3M': '3 bulan',
  '1Y': '1 tahun',
}

interface TimeframeFilterProps {
  value: Timeframe
  onChange: (tf: Timeframe) => void
  /** Timeframe yang datanya tidak cukup — akan di-disable */
  disabledTimeframes?: Set<Timeframe>
  /** Jumlah hari data yang tersedia, untuk pesan tooltip */
  availableDays?: number
}

export function TimeframeFilter({
  value,
  onChange,
  disabledTimeframes,
  availableDays,
}: TimeframeFilterProps) {
  return (
    <div className="flex bg-zinc-900/80 backdrop-blur-md p-1 rounded-full border border-white/10 gap-1">
      {TIMEFRAMES.map((tf) => {
        const isActive = value === tf
        const isDisabled = disabledTimeframes?.has(tf) ?? false
        const needed = TIMEFRAME_DAYS[tf]

        // Tooltip: tampilkan hanya jika disabled dan kita tahu berapa hari tersedia
        const title =
          isDisabled && availableDays !== undefined
            ? `Data tersedia ${availableDays} hari — butuh minimal ${needed} hari untuk ${TIMEFRAME_LABEL[tf]}`
            : undefined

        return (
          <button
            key={tf}
            disabled={isDisabled}
            title={title}
            onClick={() => {
              if (!isDisabled) onChange(tf)
            }}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              isActive
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {tf}
          </button>
        )
      })}
    </div>
  )
}
