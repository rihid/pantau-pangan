'use client'

import { VOLATILITY_THRESHOLDS, type Timeframe } from '@pantau-pangan/shared'

interface LegendPanelProps {
  timeframe: Timeframe
  availableDays?: number
  disabledTimeframes?: Set<Timeframe>
}

export function LegendPanel({ timeframe, availableDays, disabledTimeframes }: LegendPanelProps) {
  const threshold = VOLATILITY_THRESHOLDS[timeframe]
  const significant = threshold.significant
  const stable = threshold.stable / 5

  const needsMore =
    availableDays !== undefined && disabledTimeframes !== undefined && disabledTimeframes.size > 0

  return (
    <aside
      aria-label="Legenda bubble chart"
      className="hidden lg:flex flex-col gap-5 w-[220px] shrink-0 h-full overflow-y-auto border-r border-border bg-card/40 px-4 py-5"
    >
      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Legenda
        </h2>

        <ul className="flex flex-col gap-2 text-xs">
          <LegendRow color="var(--signal-up-strong)" label={`Naik ≥ ${significant}%`} />
          <LegendRow color="var(--signal-up)" label={`Naik &lt; ${significant}%`} />
          <LegendRow color="var(--signal-stable)" label={`Stabil (|Δ| &lt; ${stable}%)`} />
          <LegendRow color="var(--signal-down)" label={`Turun &lt; ${significant}%`} />
          <LegendRow color="var(--signal-down-strong)" label={`Turun ≥ ${significant}%`} />
        </ul>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Ukuran &amp; Tren
        </h2>
        <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-6 h-6 rounded-full bg-ring/40 shrink-0"
            />
            <span>
              Semakin besar bubble, semakin besar <span className="font-mono">|Δ%|</span> terhadap{' '}
              <span className="font-mono">{significant}%</span>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <svg aria-hidden="true" className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
              <polyline
                points="2,18 8,14 13,16 22,8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Garis tren di dalam bubble (jika cukup besar)</span>
          </li>
        </ul>
      </section>

      {needsMore && (
        <>
          <hr className="border-border" />
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Ketersediaan Data
            </h2>
            <p className="text-xs text-muted-foreground">
              Data tersedia <span className="font-mono text-foreground">{availableDays}</span> hari.
              Sebagian timeframe menunggu akumulasi lebih lanjut.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {Array.from(disabledTimeframes ?? []).map((tf) => (
                <span
                  key={tf}
                  className="inline-flex items-center rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {tf}
                </span>
              ))}
            </div>
          </section>
        </>
      )}
    </aside>
  )
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-block w-3 h-3 rounded-sm shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-muted-foreground">{label}</span>
    </li>
  )
}
