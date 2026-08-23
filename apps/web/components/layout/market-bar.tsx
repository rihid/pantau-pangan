'use client'

interface MarketBarProps {
  provinsiNama: string
  isLive: boolean
  latestDate?: string
  earliestDate?: string
}

function formatTanggal(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  })
}

export function MarketBar({ provinsiNama, isLive, latestDate, earliestDate }: MarketBarProps) {
  return (
    <div
      role="status"
      aria-label="Status data harga pangan"
      className="flex items-center justify-between gap-3 h-9 px-4 border-b border-border bg-background/70 backdrop-blur-md"
    >
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-foreground truncate">
          Harga Pangan Nasional
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">
          · {provinsiNama}
        </span>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {isLive && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-padi-green">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-padi-green opacity-75 animate-ping motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-padi-green" />
            </span>
            Live
          </span>
        )}
        {latestDate && (
          <span className="hidden sm:inline font-mono text-[11px] text-muted-foreground">
            data {formatTanggal(latestDate)}
            {earliestDate && ` · ${formatTanggal(earliestDate)}`}
          </span>
        )}
      </div>
    </div>
  )
}
