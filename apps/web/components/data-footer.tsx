interface DataFooterProps {
  /** YYYY-MM-DD */
  latestDate?: string
  /** YYYY-MM-DD */
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

export function DataFooter({ latestDate, earliestDate }: DataFooterProps) {
  return (
    <footer className="flex items-center justify-between px-4 py-1.5 text-xs text-zinc-500 bg-zinc-950/80 backdrop-blur-sm border-t border-white/5">
      <span>
        {latestDate ? (
          <>
            Data terbaru:{' '}
            <span className="text-zinc-300 font-medium">{formatTanggal(latestDate)}</span>
          </>
        ) : (
          'Memuat data...'
        )}
      </span>
      {earliestDate && latestDate && (
        <span>
          Akumulasi sejak:{' '}
          <span className="text-zinc-300 font-medium">{formatTanggal(earliestDate)}</span>
        </span>
      )}
    </footer>
  )
}
