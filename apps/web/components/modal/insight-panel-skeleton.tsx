/**
 * Skeleton loading state for InsightPanel.
 * Shows 4 paragraph blocks of varying width with animate-pulse.
 */
export function InsightPanelSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-label="Memuat insight..." role="img">
      {/* Paragraph 1 */}
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/5" />
      </div>
      {/* Paragraph 2 */}
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-5/6" />
      </div>
      {/* Paragraph 3 */}
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-4/6" />
      </div>
      {/* Paragraph 4 */}
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-4 bg-muted rounded w-3/4" />
      </div>
    </div>
  )
}
