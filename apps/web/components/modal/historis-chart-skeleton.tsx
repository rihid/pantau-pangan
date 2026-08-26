/**
 * Skeleton loading state for HistorisChart.
 * Shows simulated axes and a line area with animate-pulse.
 */
export function HistorisChartSkeleton() {
  return (
    <div
      className="w-full animate-pulse"
      style={{ height: 300 }}
      role="img"
      aria-label="Memuat chart historis..."
    >
      <svg
        viewBox="0 0 600 300"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Simulated Y-axis */}
        <rect x="520" y="0" width="80" height="260" rx="2" fill="var(--muted)" />

        {/* Simulated X-axis */}
        <rect x="0" y="280" width="600" height="12" rx="2" fill="var(--muted)" />

        {/* Simulated chart line area — jagged blocks */}
        <rect x="10" y="90" width="100" height="180" rx="4" fill="var(--muted)" />
        <rect x="120" y="135" width="80" height="135" rx="4" fill="var(--muted)" />
        <rect x="210" y="45" width="100" height="225" rx="4" fill="var(--muted)" />
        <rect x="320" y="105" width="90" height="165" rx="4" fill="var(--muted)" />
        <rect x="420" y="75" width="90" height="195" rx="4" fill="var(--muted)" />
      </svg>
    </div>
  )
}
