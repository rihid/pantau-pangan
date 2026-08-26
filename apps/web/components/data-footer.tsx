interface DataFooterProps {
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

export function DataFooter({ earliestDate }: DataFooterProps) {
  return (
    <footer className="flex items-center justify-between px-4 py-1 text-[11px] font-mono text-muted-foreground bg-background/70 backdrop-blur-sm border-t border-border">
      <span>
        Sumber: <span className="text-foreground font-medium">Bank Indonesia · PIHPS</span>
      </span>
      {earliestDate && (
        <span className="hidden sm:inline">
          Akumulasi sejak:{' '}
          <span className="text-foreground font-medium">{formatTanggal(earliestDate)}</span>
        </span>
      )}
    </footer>
  )
}
