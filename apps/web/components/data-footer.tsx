interface DataFooterProps {
  latestDate?: string
  earliestDate?: string
}

export function DataFooter({ latestDate, earliestDate }: DataFooterProps) {
  return (
    <footer className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-t border-border bg-background">
      <span>
        {latestDate ? (
          <>
            Data terbaru: <span className="font-medium text-foreground">{latestDate}</span>
          </>
        ) : (
          'Memuat data...'
        )}
      </span>
      {earliestDate && latestDate && (
        <span>
          Data sejak: <span className="font-medium text-foreground">{earliestDate}</span>
        </span>
      )}
    </footer>
  )
}
