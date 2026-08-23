/**
 * Skeleton loading state for HistorisChart.
 * Shows simulated axes and a line area with animate-pulse.
 */
export function HistorisChartSkeleton() {
  return (
    <div
      className="w-full animate-pulse"
      style={{ height: 200 }}
      role="img"
      aria-label="Memuat chart historis..."
    >
      <svg
        viewBox="0 0 600 200"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Simulated Y-axis */}
        <rect x="0" y="0" width="40" height="180" rx="2" fill="var(--muted)" />

        {/* Simulated X-axis */}
        <rect x="0" y="185" width="600" height="8" rx="2" fill="var(--muted)" />

        {/* Simulated chart line area — jagged blocks */}
        <rect x="50" y="60" width="100" height="120" rx="4" fill="var(--muted)" />
        <rect x="160" y="90" width="80" height="90" rx="4" fill="var(--muted)" />
        <rect x="250" y="30" width="100" height="150" rx="4" fill="var(--muted)" />
        <rect x="360" y="70" width="90" height="110" rx="4" fill="var(--muted)" />
        <rect x="460" y="50" width="110" height="130" rx="4" fill="var(--muted)" />
      </svg>
    </div>
  )
}
