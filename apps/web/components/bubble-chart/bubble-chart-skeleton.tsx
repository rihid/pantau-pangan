const SKELETON_CIRCLES = [
  { cx: 120, cy: 90, r: 55 },
  { cx: 260, cy: 70, r: 38 },
  { cx: 390, cy: 110, r: 70 },
  { cx: 540, cy: 60, r: 42 },
  { cx: 670, cy: 95, r: 60 },
  { cx: 760, cy: 55, r: 35 },
  { cx: 80, cy: 220, r: 45 },
  { cx: 200, cy: 200, r: 65 },
  { cx: 340, cy: 240, r: 50 },
  { cx: 480, cy: 195, r: 75 },
  { cx: 620, cy: 230, r: 40 },
  { cx: 740, cy: 200, r: 58 },
  { cx: 140, cy: 360, r: 68 },
  { cx: 290, cy: 380, r: 35 },
  { cx: 430, cy: 350, r: 55 },
  { cx: 570, cy: 370, r: 48 },
  { cx: 700, cy: 355, r: 72 },
  { cx: 90, cy: 490, r: 42 },
  { cx: 240, cy: 510, r: 62 },
  { cx: 400, cy: 480, r: 38 },
  { cx: 560, cy: 500, r: 55 },
] as const

export function BubbleChartSkeleton() {
  return (
    <svg
      viewBox="0 0 800 600"
      width="100%"
      height="100%"
      role="img"
      aria-label="Memuat data bubble chart..."
    >
      {SKELETON_CIRCLES.map((circle, index) => (
        <circle
          key={index}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
          fill="#e5e7eb"
          className="animate-pulse"
        />
      ))}
    </svg>
  )
}
