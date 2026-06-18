/**
 * Skeleton loading state for GeografisTable.
 * Shows 5 rows of 6 cells with animate-pulse.
 */
export function GeografisTableSkeleton() {
  return (
    <div className="overflow-x-auto" aria-label="Memuat tabel geografis..." role="img">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {Array.from({ length: 6 }).map((_, i) => (
              <th key={i} className="px-3 py-2">
                <div className="h-4 bg-muted rounded animate-pulse w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, rowIdx) => (
            <tr key={rowIdx} className="border-t border-border">
              {Array.from({ length: 6 }).map((_, colIdx) => (
                <td key={colIdx} className="px-3 py-2">
                  <div
                    className={`h-4 bg-muted rounded animate-pulse ${colIdx === 0 ? 'w-32' : 'w-16'}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
