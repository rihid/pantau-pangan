'use client'

import type { BubbleData } from '@pantau-pangan/shared'
import { STABLE_COLOR, type BubbleSummary } from '@/lib/summary-utils'

/** Warna sinyal untuk segmen "naik" dan "turun" pada bar proporsi.
 *  Sengaja dipakai di sini karena ini DATA volatilitas (bukan dekorasi) —
 *  sesuai Signal Quarantine Rule di DESIGN.md. */
const NAIK_COLOR = 'var(--signal-up)'
const TURUN_COLOR = 'var(--signal-down)'

interface RingkasanSidebarProps {
  summary: BubbleSummary
  isLoading: boolean
  onSelect: (bubble: BubbleData) => void
}

function formatRupiah(harga: number): string {
  return `Rp${harga.toLocaleString('id-ID')}`
}

function formatPersen(perubahan: number): string {
  const sign = perubahan > 0 ? '+' : perubahan < 0 ? '−' : ''
  return `${sign}${Math.abs(perubahan).toFixed(1)}%`
}

/**
 * Panel "VERDICT" — ringkasan pasar: headline verdict + bar proporsi + top movers.
 * Komposisi mengikuti pola right-panel Verdict (VerdictCard + ranked list).
 */
export function RingkasanSidebar({ summary, isLoading, onSelect }: RingkasanSidebarProps) {
  const { naik, turun, stabil, total, topMovers } = summary

  const verdict =
    total === 0
      ? null
      : naik > turun
        ? 'Pasar didominasi kenaikan'
        : naik < turun
          ? 'Pasar didominasi penurunan'
          : 'Pasar cenderung stabil'

  return (
    <aside
      aria-label="Ringkasan harga pangan"
      className="hidden lg:flex flex-col gap-5 w-[300px] shrink-0 h-full overflow-y-auto border-l border-border bg-card/40 px-4 py-5"
    >
      {/* Verdict headline */}
      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Verdict
        </h2>
        {isLoading || total === 0 ? (
          <div className="h-6 w-3/4 rounded-md bg-muted animate-pulse motion-reduce:animate-none" />
        ) : (
          <p className="text-sm font-semibold text-foreground">
            {verdict} —{' '}
            <span className="font-mono">
              {naik}/{total}
            </span>{' '}
            naik
          </p>
        )}
      </section>

      {/* Bar proporsi */}
      <section>
        {isLoading || total === 0 ? (
          <div className="h-2 w-full rounded-full bg-muted animate-pulse motion-reduce:animate-none" />
        ) : (
          <>
            <div
              role="img"
              aria-label={`${naik} naik, ${turun} turun, ${stabil} stabil dari ${total} komoditas`}
              className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
            >
              <ProportionSegment count={naik} total={total} color={NAIK_COLOR} />
              <ProportionSegment count={turun} total={total} color={TURUN_COLOR} />
              <ProportionSegment count={stabil} total={total} color={STABLE_COLOR} />
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <LegendItem arrow="↑" label="naik" count={naik} color={NAIK_COLOR} />
              <LegendItem arrow="↓" label="turun" count={turun} color={TURUN_COLOR} />
              <LegendItem arrow="•" label="stabil" count={stabil} color={STABLE_COLOR} />
            </div>
          </>
        )}
      </section>

      <hr className="border-border" />

      {/* Top movers */}
      <section className="flex flex-col min-h-0">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Top Pergerakan
        </h2>

        {isLoading ? (
          <ul className="flex flex-col gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="h-10 rounded-md bg-muted animate-pulse motion-reduce:animate-none"
              />
            ))}
          </ul>
        ) : topMovers.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada data pergerakan.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {topMovers.map((b, idx) => {
              const isStable = b.color === STABLE_COLOR
              const arrow = isStable ? '•' : b.perubahan > 0 ? '↑' : '↓'
              const color = isStable ? STABLE_COLOR : b.perubahan > 0 ? NAIK_COLOR : TURUN_COLOR
              return (
                <li key={b.komoditasId}>
                  <button
                    onClick={() => onSelect(b)}
                    className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-padi-green/60"
                  >
                    <span
                      aria-hidden="true"
                      className="font-mono text-[10px] w-4 text-center shrink-0 text-muted-foreground"
                    >
                      {idx + 1}
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-mono text-sm w-3 text-center shrink-0"
                      style={{ color }}
                    >
                      {arrow}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-sm text-foreground">
                      {b.nama}
                    </span>
                    <span className="flex flex-col items-end shrink-0">
                      <span className="font-mono text-xs font-semibold" style={{ color }}>
                        {formatPersen(b.perubahan)}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatRupiah(b.harga)}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </aside>
  )
}

function ProportionSegment({
  count,
  total,
  color,
}: {
  count: number
  total: number
  color: string
}) {
  if (count === 0) return null
  return (
    <span
      className="h-full first:rounded-l-full last:rounded-r-full"
      style={{ width: `${(count / total) * 100}%`, backgroundColor: color }}
    />
  )
}

function LegendItem({
  arrow,
  label,
  count,
  color,
}: {
  arrow: string
  label: string
  count: number
  color: string
}) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <span aria-hidden="true" style={{ color }} className="font-mono">
        {arrow}
      </span>
      <span className="font-mono font-semibold text-foreground">{count}</span>
      <span>{label}</span>
    </span>
  )
}
