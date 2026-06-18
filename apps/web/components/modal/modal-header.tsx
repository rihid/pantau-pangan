'use client'

import type { Timeframe } from '@pantau-pangan/shared'
import { Button } from '@/components/ui/button'
import { DialogTitle } from '@/components/ui/dialog'
import { formatHargaRp, formatPerubahan } from '@/lib/modal-utils'

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']

interface ModalHeaderProps {
  nama: string
  harga: number
  timeframe: Timeframe
  onTimeframeChange: (tf: Timeframe) => void
  /** Perubahan harga untuk timeframe saat ini */
  perubahan?: number
}

export function ModalHeader({
  nama,
  harga,
  timeframe,
  onTimeframeChange,
  perubahan,
}: ModalHeaderProps) {
  const perubahanResult = formatPerubahan(perubahan ?? 0, timeframe)

  return (
    <div className="flex flex-col gap-2">
      {/* Nama komoditas sebagai judul aksesibel */}
      <DialogTitle id="komoditas-modal-title" className="text-xl font-bold leading-tight">
        {nama}
      </DialogTitle>

      {/* Harga dan perubahan */}
      <div className="flex items-center gap-3">
        <span className="text-base font-medium text-foreground">{formatHargaRp(harga)}</span>
        {/* text sudah mengandung arrow untuk non-stable (mis. ↑1.5%); stable tidak ada arrow */}
        <span className="text-sm font-medium" style={{ color: perubahanResult.color }}>
          {perubahanResult.text}
        </span>
      </div>

      {/* Tab timeframe */}
      <div className="flex gap-1">
        {TIMEFRAMES.map((tf) => (
          <Button
            key={tf}
            size="sm"
            variant={tf === timeframe ? 'default' : 'outline'}
            onClick={() => onTimeframeChange(tf)}
          >
            {tf}
          </Button>
        ))}
      </div>
    </div>
  )
}
