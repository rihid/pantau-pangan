'use client'

import { SearchFilter } from '@/components/filters/search-filter'
import { ThemeToggle } from '@/components/theme-toggle'

interface TopBarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  onRefresh: () => void
  isRefetching: boolean
}

/**
 * Top bar dashboard — wordmark kiri, omnisearch tengah, kontrol kanan.
 * Timeframe pindah ke floating dock di atas canvas (pola Verdict).
 * Filter wilayah (provinsi) pindah ke MarketBar.
 */
export function TopBar({ searchQuery, onSearchChange, onRefresh, isRefetching }: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-3 h-12 px-3 sm:px-4 border-b border-border bg-background/70 backdrop-blur-md">
      {/* Logo + wordmark */}
      <div className="flex items-center gap-2 shrink-0">
        <img
          src="/cryptobubbles_logo_transparent.png"
          alt="Logo Pantau Pangan"
          width={28}
          height={28}
          className="w-7 h-7 shrink-0 object-contain"
        />
        <span className="text-sm font-bold tracking-tight text-foreground hidden sm:block">
          Pantau Pangan
        </span>
      </div>

      {/* Omnisearch — center, flex-1 max-w-md */}
      <div className="flex-1 flex justify-center min-w-0 px-2">
        <SearchFilter value={searchQuery} onChange={onSearchChange} />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRefresh}
          disabled={isRefetching}
          aria-label="Refresh data"
          title="Refresh data"
          className="flex items-center justify-center w-8 h-8 rounded-md bg-background/80 backdrop-blur-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-padi-green/60"
        >
          <svg
            className={`w-4 h-4 ${isRefetching ? 'animate-spin motion-reduce:animate-none' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}
